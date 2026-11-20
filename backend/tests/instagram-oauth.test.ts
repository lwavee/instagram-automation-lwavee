import { createHmac, randomUUID } from "crypto";
import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import { env } from "../src/config/env";
import { generateToken } from "../src/middleware/auth";
import { InstagramAccount } from "../src/models/InstagramAccount";
import { MetaOAuthState } from "../src/models/MetaOAuthState";
import { SocialPost } from "../src/models/SocialPost";
import { ContentSchedule } from "../src/models/ContentSchedule";
import { User, IUser } from "../src/models/User";
import { requiredMetaPermissions, readDeauthorization } from "../src/services/metaGraph";
import { checkedMedia } from "../src/services/publishInput";
import { processPost, recoverPublishing } from "../src/services/publishingService";
import { SchedulerService } from "../src/services/schedulerService";
import { decryptSensitive } from "../src/utils/encryption";

const origin = "http://localhost:3000";
const appId = "100001";
const pageId = "200001";
const instagramId = "300001";
const metaUserId = "400001";
const appSecret = "isolated-test-app-secret";
const userGrant = "synthetic-user-grant";
const pageGrant = "synthetic-page-grant";
const testMongo = process.env.META_TEST_MONGODB_URI;
const app = createApp();
const meta = vi.spyOn(axios, "request");
const photo = "https://media.example.com/image.jpg";
const video = "https://media.example.com/clip.mp4";

function signedDeauthorization(issuedAt: number) {
  const content = Buffer.from(JSON.stringify({
    algorithm: "HMAC-SHA256", user_id: metaUserId, issued_at: issuedAt,
  })).toString("base64url");
  return createHmac("sha256", appSecret).update(content).digest("base64url") + "." + content;
}

describe("Meta inputs and HTTP access", () => {
  it.each(["file:///secret", "https://127.0.0.1/video.mp4", "https://x:y@media.example.com/clip.mp4", "invalid"])(
    "rejects unsupported media URL %s",
    (mediaUrl) => expect(() => checkedMedia({ mediaType: "IMAGE", mediaUrl })).toThrow(/invalid/i),
  );

  it("authenticates the Meta deauthorization signature", () => {
    const message = signedDeauthorization(Math.floor(Date.now() / 1000));
    expect(readDeauthorization(message, appSecret)?.userId).toBe(metaUserId);
    expect(readDeauthorization(message, "wrong")).toBeNull();
  });

  it("requires a session and rejects browser requests from an untrusted origin", async () => {
    const missing = await request(app).get("/api/posts");
    const malformed = await request(app).get("/api/instagram/account").set("Cookie", "auth_token=invalid");
    const csrf = await request(app).post("/api/instagram/auth-url").set("Origin", "https://outside.example.com");
    expect(missing.status).toBe(401);
    expect(malformed.status).toBe(401);
    expect(csrf.status).toBe(403);
    expect(csrf.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe.skipIf(!testMongo)("Meta HTTP integration with disposable MongoDB and simulated Meta responses", () => {
  let admin: IUser;
  let cookie: string;
  let passwordHash: string;

  beforeAll(async () => {
    if (!/^mongodb:\/\/127\.0\.0\.1:\d+$/.test(testMongo!)) {
      throw new Error("META_TEST_MONGODB_URI must be a disposable loopback-only MongoDB server without a database name.");
    }
    Object.assign(env, {
      META_APP_ID: appId, META_APP_SECRET: appSecret, META_LOGIN_CONFIG_ID: "100002",
      META_GRAPH_API_VERSION: "v26.0", META_FACEBOOK_PAGE_ID: pageId, META_INSTAGRAM_USERNAME: "test_studio",
    });
    await mongoose.connect(testMongo!, {
      dbName: "lwavee_test_" + randomUUID().replaceAll("-", ""), serverSelectionTimeoutMS: 4000,
    });
    await InstagramAccount.init();
    passwordHash = await bcrypt.hash("isolated-admin-password", 4);
  });

  beforeEach(async () => {
    meta.mockReset();
    meta.mockImplementation(async () => { throw new Error("Unexpected Meta request."); });
    await Promise.all([User.deleteMany({}), InstagramAccount.deleteMany({}), MetaOAuthState.deleteMany({}),
      SocialPost.deleteMany({}), ContentSchedule.deleteMany({})]);
    admin = await User.create({
      email: "admin@example.com", name: "Test admin", passwordHash, role: "admin",
      preferences: { autoPublishEnabled: true },
    });
    cookie = session(admin);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    meta.mockRestore();
  });

  function session(user: IUser) {
    return "auth_token=" + generateToken({
      userId: String(user._id), role: user.role, email: user.email, sessionVersion: user.sessionVersion ?? 0,
    });
  }

  function post(path: string, useCookie = cookie) {
    return request(app).post(path).set("Origin", origin).set("Cookie", useCookie);
  }

  function callback(state: string, params: Record<string, string> = { code: "test-code" }, useCookie = cookie) {
    return request(app).get("/api/instagram/callback").set("Cookie", useCookie).query({ ...params, state });
  }

  async function start() {
    const result = await post("/api/instagram/auth-url").expect(200);
    const url = new URL(result.body.data.url);
    expect(url.origin).toBe("https://www.facebook.com");
    expect(url.searchParams.get("redirect_uri")).toBe(env.BACKEND_URL + "/api/instagram/callback");
    expect(url.searchParams.get("config_id")).toBe("100002");
    expect(url.searchParams.has("client_secret")).toBe(false);
    return url.searchParams.get("state")!;
  }

  function useOAuth(options: { scopes?: string[]; expiry?: number; invalidGrant?: boolean; tasks?: string[]; ig?: string } = {}) {
    const data = (value: unknown) => ({ data: value });
    meta.mockResolvedValueOnce(data({ access_token: "synthetic-short-grant" }));
    meta.mockResolvedValueOnce(data({ access_token: userGrant, expires_in: 7200 }));
    meta.mockResolvedValueOnce(data({ data: {
      app_id: appId, is_valid: !options.invalidGrant, type: "USER", user_id: metaUserId,
      scopes: options.scopes ?? requiredMetaPermissions(), expires_at: options.expiry ?? Math.floor(Date.now() / 1000) + 7200,
    } }));
    meta.mockResolvedValueOnce(data({
      data: [{ id: "200999", instagram_business_account: { username: "unrelated" } }],
      paging: { next: "https://unused.example.com/not-followed?secret=untrusted", cursors: { after: "page-cursor" } },
    }));
    meta.mockResolvedValueOnce(data({ data: [{
      id: pageId, name: "Test Facebook Page", tasks: options.tasks ?? ["CREATE_CONTENT"], access_token: pageGrant,
      instagram_business_account: { id: instagramId, username: options.ig ?? "test_studio", followers_count: 50 },
    }] }));
  }

  async function connect() {
    useOAuth();
    const response = await callback(await start()).expect(303);
    expect(new URL(response.headers.location).searchParams.get("connected")).toBe("true");
    meta.mockReset();
    meta.mockImplementation(async () => { throw new Error("Unexpected publishing request."); });
    return (await InstagramAccount.findOne({ userId: admin._id }))!;
  }

  async function makePost(input: Record<string, unknown> = {}) {
    const result = await post("/api/posts").send({ title: "Test publication", caption: "Caption", mediaType: "IMAGE", mediaUrl: photo, ...input }).expect(201);
    return result.body.data.post as { _id: string; status: string };
  }

  it("accepts the one-use callback state across the Vercel-to-Render redirect, expires and consumes it once", async () => {
    expect((await callback("invalid")).headers.location).toContain("Invalid+or+expired");
    const state = await start();
    useOAuth();
    const callbackWithoutFrontendCookie = await callback(state, { code: "test-code" }, "").expect(303);
    expect(new URL(callbackWithoutFrontendCookie.headers.location).searchParams.get("connected")).toBe("true");
    const cancelledState = await start();
    expect((await callback(cancelledState, { error: "access_denied", error_description: "never display this" }, "")).headers.location).toContain("cancelled");
    expect((await callback(state)).headers.location).toContain("Invalid+or+expired");
    const expired = await start();
    await MetaOAuthState.updateMany({}, { expiresAt: new Date(0) });
    expect((await callback(expired, { code: "test-code" }, "")).headers.location).toContain("Invalid+or+expired");
    expect(meta).not.toHaveBeenCalled();
  });

  it("handles invalid code without reflecting Meta errors or logging credentials", async () => {
    const error = new AxiosError("synthetic-sensitive-error");
    error.response = { status: 400, data: { error: { code: 100, message: "synthetic-sensitive-error" } } } as never;
    meta.mockRejectedValueOnce(error);
    const result = await callback(await start()).expect(303);
    const message = new URL(result.headers.location).searchParams.get("error");
    expect(message).toContain("could not exchange");
    expect(message).not.toContain("synthetic-sensitive-error");
    expect(await InstagramAccount.countDocuments()).toBe(0);
  });

  it.each([
    [{ scopes: ["instagram_basic"] }, "permissions"],
    [{ expiry: 1 }, "expired"],
    [{ invalidGrant: true }, "invalid or mismatched"],
    [{ tasks: ["ANALYZE"] }, "Page content task"],
    [{ ig: "another_account" }, "configured Instagram"],
  ])("rejects an ineligible grant %j", async (options, message) => {
    useOAuth(options);
    const result = await callback(await start()).expect(303);
    expect(new URL(result.headers.location).searchParams.get("error")).toContain(message);
    expect(await InstagramAccount.countDocuments()).toBe(0);
  });

  it("discovers the exact Page across pagination and persists encrypted grants through reconnection", async () => {
    useOAuth();
    const result = await callback(await start()).expect(303);
    expect(new URL(result.headers.location).searchParams.get("connected")).toBe("true");
    expect(meta.mock.calls[4][0]).toMatchObject({
      url: "https://graph.facebook.com/v26.0/me/accounts", params: { after: "page-cursor" },
    });
    const record = await InstagramAccount.findOne().select("+accessTokenEncrypted +pageTokenEncrypted");
    expect(decryptSensitive(record!.accessTokenEncrypted!)).toBe(userGrant);
    expect(decryptSensitive(record!.pageTokenEncrypted!)).toBe(pageGrant);
    const visible = await request(app).get("/api/instagram/account").set("Cookie", cookie).expect(200);
    expect(visible.body.data.account).toMatchObject({
      username: "test_studio", instagramId, followersCount: 50, page: { id: pageId, name: "Test Facebook Page", canPublish: true },
    });
    expect(visible.text).not.toMatch(/synthetic-(user|page)-grant|TokenEncrypted/);

    useOAuth();
    await callback(await start()).expect(303);
    expect(await InstagramAccount.countDocuments()).toBe(1);
    const other = await User.create({ email: "other@example.com", name: "Other", passwordHash, role: "admin" });
    await post("/api/instagram/disconnect", session(other)).expect(200);
    expect((await InstagramAccount.findById(record!._id))?.isConnected).toBe(true);
    await post("/api/instagram/disconnect").expect(200);
    const disconnected = await InstagramAccount.findById(record!._id).select("+accessTokenEncrypted +pageTokenEncrypted");
    expect(disconnected?.accessTokenEncrypted).toBeUndefined();
    expect(disconnected?.pageTokenEncrypted).toBeUndefined();
  });

  it("reports expiry and invalidates a revoked grant from a signed Meta callback", async () => {
    const account = await connect();
    await InstagramAccount.updateOne({ _id: account._id }, { tokenExpiresAt: new Date(0) });
    const expired = await request(app).get("/api/instagram/account").set("Cookie", cookie).expect(200);
    expect(expired.body.data.health).toBe("reconnect_required");
    await request(app).post("/api/instagram/deauthorize").type("form").send({ signed_request: "forged" }).expect(400);
    await request(app).post("/api/instagram/deauthorize").type("form").send({
      signed_request: signedDeauthorization(Math.floor(Date.now() / 1000)),
    }).expect(200);
    expect((await InstagramAccount.findById(account._id))?.isConnected).toBe(false);
  });

  it("uses HttpOnly cookies, omits the session and password from JSON, and revokes sessions at logout", async () => {
    const login = await request(app).post("/api/auth/login").set("Origin", origin).send({
      email: admin.email, password: "isolated-admin-password",
    }).expect(200);
    expect(login.headers["set-cookie"][0]).toMatch(/HttpOnly.*SameSite=Lax/);
    expect(login.body.data.token).toBeUndefined();
    expect(login.body.data.user.passwordHash).toBeUndefined();
    await post("/api/auth/logout").expect(200);
    await request(app).get("/api/auth/me").set("Cookie", cookie).expect(401);
    const viewer = await User.create({ email: "viewer@example.com", name: "Viewer", passwordHash, role: "viewer" });
    await post("/api/instagram/auth-url", session(viewer)).expect(403);
    await request(app).post("/api/auth/register").set("Origin", origin).send({
      name: "Untrusted", email: "untrusted@example.com", password: "long-password",
    }).expect(403);
  });

  function reply(path: string, response: unknown) {
    meta.mockImplementationOnce(async (config: AxiosRequestConfig) => {
      expect(config.url).toBe("https://graph.facebook.com/v26.0" + path);
      expect(config.headers?.Authorization).toBe("Bearer " + pageGrant);
      return { data: response };
    });
  }

  async function queue(id: string) {
    await post("/api/posts/" + id + "/publish-now").expect(202);
    return (await SocialPost.findById(id))!;
  }

  it("publishes one Instagram image when manual and worker requests race", async () => {
    await connect();
    const { _id } = await makePost();
    const candidate = await queue(_id);
    await post("/api/posts/" + _id + "/publish-now").expect(409);
    reply("/" + instagramId + "/media", { id: "50001" });
    reply("/50001", { status_code: "FINISHED" });
    reply("/" + instagramId + "/media_publish", { id: "60001" });
    reply("/60001", { permalink: "https://www.instagram.com/p/test/" });
    const outcomes = await Promise.all([processPost(candidate), processPost(candidate)]);
    expect(outcomes.sort()).toEqual(["published", "skipped"]);
    expect(await SocialPost.findById(_id)).toMatchObject({ status: "published", instagramPostId: "60001" });
    const form = meta.mock.calls[0][0].data as URLSearchParams;
    expect(form.get("image_url")).toBe(photo);
    expect(form.has("video_url")).toBe(false);
    await post("/api/posts/" + _id + "/publish-now").expect(409);
    expect(meta).toHaveBeenCalledTimes(4);
  });

  it("creates carousel children in order and publishes the parent", async () => {
    await connect();
    const { _id } = await makePost({ mediaType: "CAROUSEL", mediaUrl: "", mediaItems: [
      { type: "IMAGE", url: photo }, { type: "VIDEO", url: video },
    ] });
    const candidate = await queue(_id);
    reply("/" + instagramId + "/media", { id: "50001" });
    reply("/" + instagramId + "/media", { id: "50002" });
    reply("/50001", { status_code: "FINISHED" });
    reply("/50002", { status_code: "FINISHED" });
    reply("/" + instagramId + "/media", { id: "50003" });
    reply("/50003", { status_code: "FINISHED" });
    reply("/" + instagramId + "/media_publish", { id: "60002" });
    reply("/60002", {});
    expect(await processPost(candidate)).toBe("published");
    expect(meta.mock.calls[4][0].data.get("children")).toBe("50001,50002");
    expect(meta.mock.calls[1][0].data.get("media_type")).toBe("VIDEO");
  });

  it.each(["REELS", "VIDEO"])("resumes processing a %s without creating a second container", async (mediaType) => {
    await connect();
    const { _id } = await makePost({ mediaType, mediaUrl: video });
    const candidate = await queue(_id);
    reply("/" + instagramId + "/media", { id: "50005" });
    reply("/50005", { status_code: "IN_PROGRESS" });
    expect(await processPost(candidate)).toBe("processing");
    expect(meta.mock.calls[0][0].data.get("media_type")).toBe("REELS");
    expect(meta.mock.calls[0][0].data.get("share_to_feed")).toBe("true");
    await SocialPost.updateOne({ _id }, { nextAttemptAt: new Date(0) });
    reply("/50005", { status_code: "FINISHED" });
    reply("/" + instagramId + "/media_publish", { id: "60005" });
    reply("/60005", {});
    expect(await SchedulerService.processDuePosts()).toMatchObject({ published: 1 });
  });

  it.each([["TEXT", "feed"], ["IMAGE", "photos"]])("publishes Facebook %s only to the Page endpoint", async (mediaType, edge) => {
    await connect();
    const { _id } = await makePost({ destination: "facebook", mediaType, ...(mediaType === "TEXT" && { mediaUrl: "" }) });
    const candidate = await queue(_id);
    reply("/" + pageId + "/" + edge, { post_id: pageId + "_61000" });
    reply("/" + pageId + "_61000", {});
    expect(await processPost(candidate)).toBe("published");
    expect((await SocialPost.findById(_id))?.facebookPostId).toBe(pageId + "_61000");
    expect(meta).toHaveBeenCalledTimes(2);
    expect(meta.mock.calls.flatMap(([config]) => config.url)).not.toContain("/" + instagramId + "/media_publish");
  });

  it("holds an ambiguous publish for review after a network failure or stale submission", async () => {
    await connect();
    const { _id } = await makePost({ destination: "facebook", mediaType: "TEXT", mediaUrl: "" });
    const candidate = await queue(_id);
    meta.mockRejectedValueOnce(new AxiosError("timeout"));
    expect(await processPost(candidate)).toBe("review_required");
    await post("/api/posts/" + _id + "/publish-now").expect(409);
    expect(meta).toHaveBeenCalledTimes(1);
    await SocialPost.updateOne({ _id }, { status: "publishing", leaseUntil: new Date(0), publishClaim: "crashed" });
    await recoverPublishing(new Date());
    expect((await SocialPost.findById(_id))?.status).toBe("review_required");
  });

  it("backs off on transient pre-submit errors and records definitive media failure", async () => {
    await connect();
    const { _id } = await makePost();
    const candidate = await queue(_id);
    meta.mockRejectedValueOnce(new AxiosError("temporary container error"));
    expect(await processPost(candidate)).toBe("processing");
    expect((await SocialPost.findById(_id))?.retryCount).toBe(1);
    await SocialPost.updateOne({ _id }, { nextAttemptAt: new Date(0) });
    reply("/" + instagramId + "/media", { id: "50010" });
    reply("/50010", { status_code: "ERROR" });
    expect(await SchedulerService.processDuePosts()).toMatchObject({ failed: 1 });
    expect((await SocialPost.findById(_id))?.errorMessage).toContain("processing reported ERROR");
  });

  it("deduplicates post creation and reevaluates the current auto-publish preference when due", async () => {
    await connect();
    const key = randomUUID();
    const body = {
      title: "Schedule once", mediaType: "IMAGE", mediaUrl: photo,
      scheduledPublishTime: new Date(Date.now() + 60_000).toISOString(), isAutoPublish: true,
    };
    const first = await post("/api/posts").set("Idempotency-Key", key).send(body).expect(201);
    const second = await post("/api/posts").set("Idempotency-Key", key).send(body).expect(200);
    expect(second.body.data.post._id).toBe(first.body.data.post._id);
    await User.updateOne({ _id: admin._id }, { "preferences.autoPublishEnabled": false });
    await SocialPost.updateOne({ _id: first.body.data.post._id }, { scheduledPublishTime: new Date(0) });
    expect(await SchedulerService.processDuePosts()).toMatchObject({ skipped: 1 });
    expect((await SocialPost.findById(first.body.data.post._id))?.status).toBe("review_pending");
    expect(meta).not.toHaveBeenCalled();
  });
});

