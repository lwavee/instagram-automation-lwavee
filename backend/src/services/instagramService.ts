import { env } from "../config/env";
import { InstagramAccount, IInstagramAccount } from "../models/InstagramAccount";
import { decryptSensitive, encryptSensitive } from "../utils/encryption";
import { graph, graphBase, MetaError, requiredMetaPermissions } from "./metaGraph";

interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
}

interface FacebookPage {
  id: string;
  name: string;
  tasks?: string[];
  access_token?: string;
  instagram_business_account?: InstagramProfile;
}

const pageFields = "id,name,tasks,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,follows_count,media_count}";
const digits = /^\d+$/;

function settings() {
  const { META_APP_ID: appId, META_APP_SECRET: appSecret, META_LOGIN_CONFIG_ID: configId,
    META_FACEBOOK_PAGE_ID: pageId, META_INSTAGRAM_USERNAME: username } = env;
  if (!appId || !appSecret || !configId || !env.META_GRAPH_API_VERSION || !pageId || !username ||
      !digits.test(appId) || !digits.test(configId)) {
    throw new MetaError("Configure the Meta app, Login for Business configuration, Graph version, and verified Page and Instagram targets.");
  }
  // OAuth callback is served by Express, so its origin must be the backend host.
  // FRONTEND_URL is only the post-callback redirect destination.
  const origin = new URL(env.BACKEND_URL);
  const redirect = new URL(env.META_REDIRECT_URI || "/api/instagram/callback", origin);
  if (redirect.origin !== origin.origin || redirect.pathname !== "/api/instagram/callback" ||
      redirect.search || redirect.hash || redirect.username || redirect.password ||
      (env.NODE_ENV === "production" && redirect.protocol !== "https:")) {
    throw new MetaError("Use the dashboard HTTPS URL followed by /api/instagram/callback for Meta OAuth.");
  }
  return { appId, appSecret, configId, callback: redirect.href, pageId, username: username.replace(/^@/, "").toLowerCase() };
}

export function canPublishPage(tasks: string[] = []) {
  return tasks.includes("CREATE_CONTENT") || tasks.includes("PROFILE_PLUS_CREATE_CONTENT");
}

async function discoverPage(token: string, pageId: string, username: string) {
  let after: string | undefined;
  const cursors = new Set<string>();
  for (let pageNumber = 0; pageNumber < 100; pageNumber++) {
    const result: { data?: FacebookPage[]; paging?: { next?: string; cursors?: { after?: string } } } =
      await graph("GET", "/me/accounts", { fields: pageFields, limit: 100, ...(after && { after }) }, token);
    const page = result.data?.find((item) => item.id === pageId);
    if (page) {
      if (!page.instagram_business_account || !digits.test(page.instagram_business_account.id) ||
          page.instagram_business_account.username?.toLowerCase() !== username) {
        throw new MetaError("The selected Facebook Page does not expose the configured Instagram professional account.", false, true);
      }
      if (!page.access_token || !canPublishPage(page.tasks)) {
        throw new MetaError("Grant the account the Page content task and allow the Page in Meta authorization.", false, true);
      }
      return { ...page, profile: page.instagram_business_account, pageToken: page.access_token };
    }
    if (!result.paging?.next) break;
    after = result.paging.cursors?.after;
    if (!after || cursors.has(after)) break;
    cursors.add(after);
  }
  throw new MetaError("The configured Facebook Page was absent from authorized Pages. Check Page access and asset selection.", false, true);
}

async function checkGrant(token: string, appId: string, appSecret: string) {
  const result = await graph<{ data?: {
    app_id?: string; is_valid?: boolean; type?: string; scopes?: string[]; user_id?: string;
    expires_at?: number; data_access_expires_at?: number;
  } }>("GET", "/debug_token", { input_token: token }, appId + "|" + appSecret);
  const grant = result.data;
  if (!grant?.is_valid || grant.app_id !== appId || grant.type !== "USER" || !grant.user_id || !digits.test(grant.user_id)) {
    throw new MetaError("Meta returned an invalid or mismatched user grant. Reconnect the account.", false, true);
  }
  const permissions = requiredMetaPermissions();
  const missing = permissions.filter((permission) => !grant.scopes?.includes(permission));
  if (missing.length) {
    throw new MetaError("Grant these Meta permissions when reconnecting: " + missing.join(", ") + ".", false, true);
  }
  const expiry = [grant.expires_at, grant.data_access_expires_at]
    .filter((value): value is number => typeof value === "number" && value > 0);
  const expiresAt = expiry.length ? new Date(Math.min(...expiry) * 1000) : undefined;
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw new MetaError("Meta access has expired. Reconnect the account.", false, true);
  }
  return { expiresAt, permissions, metaUserId: grant.user_id };
}

export class InstagramService {
  static getOAuthUrl(state: string): string {
    const { appId, configId, callback } = settings();
    graphBase();
    const url = new URL("https://www.facebook.com/" + env.META_GRAPH_API_VERSION + "/dialog/oauth");
    url.search = new URLSearchParams({
      client_id: appId,
      config_id: configId,
      redirect_uri: callback,
      response_type: "code",
      override_default_response_type: "true",
      auth_type: "rerequest",
      state,
    }).toString();
    return url.href;
  }

  static async handleOAuthCallback(code: string, userId: string) {
    const { appId, appSecret, callback, pageId, username } = settings();
    let shortToken: string | undefined;
    try {
      const result = await graph<{ access_token?: string }>("GET", "/oauth/access_token", {
        client_id: appId, client_secret: appSecret, redirect_uri: callback, code,
      });
      shortToken = result.access_token;
    } catch (error) {
      if (error instanceof MetaError && !error.retryable) {
        throw new MetaError("Meta could not exchange the authorization code. Restart the connection and check the callback configuration.");
      }
      throw error;
    }
    if (!shortToken) throw new MetaError("Meta did not return a user access token.");

    const { access_token: token, expires_in: expiresIn } = await graph<{ access_token?: string; expires_in?: number }>(
      "GET", "/oauth/access_token", {
        client_id: appId, client_secret: appSecret, grant_type: "fb_exchange_token", fb_exchange_token: shortToken,
      },
    );
    if (!token) throw new MetaError("Meta did not return a long-lived user access token.");
    const grant = await checkGrant(token, appId, appSecret);
    const page = await discoverPage(token, pageId, username);
    const profile = page.profile;
    const tokenExpiresAt = grant.expiresAt || (expiresIn && expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : undefined);
    if (!tokenExpiresAt) throw new MetaError("Meta did not report an expiration for the long-lived user token.");

    return InstagramAccount.findOneAndUpdate(
      { instagramId: profile.id, userId },
      { $set: {
        username: profile.username, name: profile.name || profile.username,
        profilePictureUrl: profile.profile_picture_url || "",
        followersCount: profile.followers_count ?? 0, followsCount: profile.follows_count ?? 0,
        mediaCount: profile.media_count ?? 0, pageId, pageName: page.name, pageTasks: page.tasks,
        accessTokenEncrypted: encryptSensitive(token), pageTokenEncrypted: encryptSensitive(page.pageToken),
        authorizationAppId: appId, tokenExpiresAt, isConnected: true,
        metaUserId: grant.metaUserId, lastAuthorizedAt: new Date(),
        lastSyncedAt: new Date(), permissions: grant.permissions,
      } },
      { new: true, upsert: true, runValidators: true },
    );
  }

  static async checkHealth(account: IInstagramAccount) {
    const { appId, appSecret, pageId, username } = settings();
    const token = this.userToken(account);
    const grant = await checkGrant(token, appId, appSecret);
    const page = await discoverPage(token, pageId, username);
    if (page.profile.id !== account.instagramId) throw new MetaError("The linked Instagram account changed. Reconnect.", false, true);
    await InstagramAccount.updateOne(
      { _id: account._id, accessTokenEncrypted: account.accessTokenEncrypted, isConnected: true },
      { $set: {
        lastSyncedAt: new Date(), permissions: grant.permissions, pageName: page.name, pageTasks: page.tasks,
        pageTokenEncrypted: encryptSensitive(page.pageToken), followersCount: page.profile.followers_count ?? 0,
        followsCount: page.profile.follows_count ?? 0, mediaCount: page.profile.media_count ?? 0,
        ...(grant.expiresAt && { tokenExpiresAt: grant.expiresAt }),
      } },
    );
  }

  static userToken(account: IInstagramAccount) {
    const { appId, pageId, username } = settings();
    if (!account.isConnected || !account.accessTokenEncrypted || !account.tokenExpiresAt ||
        account.tokenExpiresAt.getTime() <= Date.now() || account.authorizationAppId !== appId ||
        account.pageId !== pageId || account.username.toLowerCase() !== username ||
        !requiredMetaPermissions().every((permission) => account.permissions.includes(permission))) {
      throw new MetaError("The Meta connection needs authorization. Reconnect the configured Instagram account and Facebook Page.", false, true);
    }
    try {
      return decryptSensitive(account.accessTokenEncrypted);
    } catch {
      throw new MetaError("The stored Meta grant could not be read. Reconnect the account.", false, true);
    }
  }

  static async refreshHealth(account: IInstagramAccount) {
    try {
      await this.checkHealth(account);
    } catch (error) {
      if (error instanceof MetaError && error.authorization) {
        await this.invalidateGrant(account);
      }
      throw error;
    }
  }

  static async invalidateGrant(account: IInstagramAccount) {
    await InstagramAccount.updateOne(
      { _id: account._id, accessTokenEncrypted: account.accessTokenEncrypted },
      { $set: { isConnected: false }, $unset: { accessTokenEncrypted: "", pageTokenEncrypted: "" } },
    );
  }

  static async monitorTokenHealth() {
    if (!env.META_APP_ID || !env.META_LOGIN_CONFIG_ID || !env.META_GRAPH_API_VERSION) return;
    const accounts = await InstagramAccount.find({
      isConnected: true, authorizationAppId: env.META_APP_ID,
      lastSyncedAt: { $lt: new Date(Date.now() - 6 * 60 * 60_000) },
    }).select("+accessTokenEncrypted").limit(10);
    for (const account of accounts) {
      try { await this.refreshHealth(account); }
      catch { console.warn("Meta grant health check could not be completed."); }
    }
  }
}

