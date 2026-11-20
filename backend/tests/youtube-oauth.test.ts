import { afterEach, describe, expect, it } from "vitest";
import { env } from "../src/config/env";
import { YouTubeService, YOUTUBE_SCOPES } from "../src/services/youtubeService";

const original = { ...env };

afterEach(() => Object.assign(env, original));

describe("YouTube OAuth configuration", () => {
  it("builds a server-side Google authorization URL with only upload and channel-read scopes", () => {
    Object.assign(env, {
      BACKEND_URL: "http://localhost:5000",
      YOUTUBE_OAUTH_CLIENT_ID: "test-client-id",
      YOUTUBE_OAUTH_CLIENT_SECRET: "test-client-secret",
      YOUTUBE_OAUTH_REDIRECT_URI: "http://localhost:5000/api/youtube/callback",
      NODE_ENV: "test",
    });

    const url = new URL(YouTubeService.getAuthorizationUrl("a".repeat(64)));
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:5000/api/youtube/callback");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("state")).toBe("a".repeat(64));
    expect(url.searchParams.get("scope")?.split(" ")).toEqual([...YOUTUBE_SCOPES]);
    expect(url.searchParams.toString()).not.toContain("client_secret");
  });

  it("rejects a callback on the frontend host instead of the backend callback", () => {
    Object.assign(env, {
      BACKEND_URL: "https://api.example.com",
      YOUTUBE_OAUTH_CLIENT_ID: "test-client-id",
      YOUTUBE_OAUTH_CLIENT_SECRET: "test-client-secret",
      YOUTUBE_OAUTH_REDIRECT_URI: "https://dashboard.example.com/api/youtube/callback",
      NODE_ENV: "production",
    });
    expect(() => YouTubeService.getAuthorizationUrl("b".repeat(64))).toThrow(/backend HTTPS URL/i);
  });

  it("requires OAuth client credentials before starting a connection", () => {
    Object.assign(env, { YOUTUBE_OAUTH_CLIENT_ID: undefined, YOUTUBE_OAUTH_CLIENT_SECRET: undefined });
    expect(() => YouTubeService.getAuthorizationUrl("c".repeat(64))).toThrow(/OAuth client ID and secret/i);
  });
});
