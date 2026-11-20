import axios from "axios";
import { env } from "../config/env";
import { YouTubeAccount, IYouTubeAccount } from "../models/YouTubeAccount";
import { decryptSensitive, encryptSensitive } from "../utils/encryption";

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
] as const;

export class YouTubeError extends Error {
  constructor(message: string, readonly statusCode = 400, readonly uncertain = false) {
    super(message);
  }
}

function config() {
  const { YOUTUBE_OAUTH_CLIENT_ID: clientId, YOUTUBE_OAUTH_CLIENT_SECRET: clientSecret } = env;
  if (!clientId || !clientSecret) {
    throw new YouTubeError("Configure the YouTube OAuth client ID and secret on the backend.", 503);
  }
  const origin = new URL(env.BACKEND_URL);
  const callback = new URL(env.YOUTUBE_OAUTH_REDIRECT_URI || "/api/youtube/callback", origin);
  if (callback.origin !== origin.origin || callback.pathname !== "/api/youtube/callback" || callback.search || callback.hash ||
      callback.username || callback.password || (env.NODE_ENV === "production" && callback.protocol !== "https:")) {
    throw new YouTubeError("Use the backend HTTPS URL followed by /api/youtube/callback as the YouTube OAuth callback.", 503);
  }
  return { clientId, clientSecret, callback: callback.href };
}

export class YouTubeService {
  static getAuthorizationUrl(state: string) {
    const { clientId, callback } = config();
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callback,
      response_type: "code",
      scope: YOUTUBE_SCOPES.join(" "),
      access_type: "offline",
      include_granted_scopes: "true",
      prompt: "consent",
      state,
    }).toString();
    return url.href;
  }

  static async exchangeAuthorizationCode(code: string, userId: string) {
    const { clientId, clientSecret, callback } = config();
    let response;
    try {
      response = await axios.post("https://oauth2.googleapis.com/token", new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callback,
        grant_type: "authorization_code",
      }), { timeout: 15000, maxRedirects: 0, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    } catch {
      throw new YouTubeError("Google could not exchange the authorization code. Restart the YouTube connection.", 502);
    }
    const token = response.data as { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string };
    if (!token.access_token || typeof token.expires_in !== "number" || !Number.isFinite(token.expires_in) || token.expires_in <= 0) {
      throw new YouTubeError("Google returned an incomplete YouTube grant.", 502);
    }
    const expiresIn = token.expires_in;
    const granted = new Set((token.scope || "").split(/\s+/).filter(Boolean));
    const missing = YOUTUBE_SCOPES.filter((scope) => !granted.has(scope));
    if (missing.length) throw new YouTubeError("Grant the YouTube upload and channel-read permissions, then reconnect.", 403);

    const prior = await YouTubeAccount.findOne({ userId }).select("+refreshTokenEncrypted");
    const refreshToken = token.refresh_token || (prior?.refreshTokenEncrypted ? decryptSensitive(prior.refreshTokenEncrypted) : "");
    if (!refreshToken) throw new YouTubeError("Google did not return an offline refresh token. Reconnect and approve offline access.", 502);
    const channel = await this.fetchChannel(token.access_token);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await YouTubeAccount.findOneAndUpdate({ userId }, {
      $set: {
        channelId: channel.id,
        channelTitle: channel.title,
        accessTokenEncrypted: encryptSensitive(token.access_token),
        refreshTokenEncrypted: encryptSensitive(refreshToken),
        tokenExpiresAt: expiresAt,
        scopes: [...granted],
        connectedAt: new Date(),
      },
    }, { new: true, upsert: true, runValidators: true });
    return { channelId: channel.id, channelTitle: channel.title, tokenExpiresAt: expiresAt };
  }

  private static async fetchChannel(accessToken: string) {
    try {
      const response = await axios.get("https://youtube.googleapis.com/youtube/v3/channels", {
        params: { part: "snippet", mine: true },
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 15000,
        maxRedirects: 0,
      });
      const channel = response.data?.items?.[0];
      if (!channel?.id || typeof channel?.snippet?.title !== "string") {
        throw new YouTubeError("The selected Google account does not have a YouTube channel ready for uploads.", 409);
      }
      return { id: String(channel.id), title: String(channel.snippet.title) };
    } catch (error) {
      if (error instanceof YouTubeError) throw error;
      throw new YouTubeError("Could not verify the YouTube channel for this Google account.", 502);
    }
  }

  static async getValidAccessToken(account: IYouTubeAccount) {
    if (account.tokenExpiresAt.getTime() > Date.now() + 60_000) {
      try { return decryptSensitive(account.accessTokenEncrypted); }
      catch { throw new YouTubeError("The stored YouTube authorization cannot be read. Reconnect the channel.", 401); }
    }
    const { clientId, clientSecret } = config();
    let refreshToken: string;
    try { refreshToken = decryptSensitive(account.refreshTokenEncrypted); }
    catch { throw new YouTubeError("The stored YouTube authorization cannot be read. Reconnect the channel.", 401); }
    try {
      const response = await axios.post("https://oauth2.googleapis.com/token", new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }), { timeout: 15000, maxRedirects: 0, headers: { "Content-Type": "application/x-www-form-urlencoded" } });
      const token = response.data as { access_token?: string; expires_in?: number };
      if (!token.access_token || typeof token.expires_in !== "number" || !Number.isFinite(token.expires_in) || token.expires_in <= 0) {
        throw new Error("incomplete token response");
      }
      const expiresIn = token.expires_in;
      account.accessTokenEncrypted = encryptSensitive(token.access_token);
      account.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
      await account.save();
      return token.access_token;
    } catch {
      throw new YouTubeError("YouTube authorization expired or was revoked. Reconnect the channel.", 401);
    }
  }
}
