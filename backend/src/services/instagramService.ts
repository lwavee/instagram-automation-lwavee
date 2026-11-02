import axios from "axios";
import { InstagramAccount } from "../models/InstagramAccount";
import { decryptSensitive } from "../utils/encryption";
import { env } from "../config/env";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export interface InstagramPublishParams {
  accountId: string;
  mediaType: "REELS" | "IMAGE" | "VIDEO";
  mediaUrl: string;
  caption: string;
  coverImageUrl?: string;
  shareToFeed?: boolean;
}

export interface PublishResult {
  success: boolean;
  instagramPostId?: string;
  containerId?: string;
  permalink?: string;
  error?: string;
  statusMessage: string;
}

export class InstagramService {
  /**
   * Generates official Facebook OAuth URL for Instagram Business Account login
   */
  public static getOAuthUrl(redirectUri?: string): string {
    const appId = process.env.INSTAGRAM_APP_ID;
    if (!appId) {
      throw new Error("INSTAGRAM_APP_ID is not configured in environment or settings");
    }

    const callback = redirectUri || env.INSTAGRAM_REDIRECT_URI || `${env.BACKEND_URL}/api/instagram/callback`;
    const scopes = [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
    ].join(",");

    return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      callback
    )}&scope=${encodeURIComponent(scopes)}&response_type=code`;
  }

  /**
   * Exchanges authorization code for long-lived access token and retrieves linked Instagram account
   */
  public static async handleOAuthCallback(code: string, redirectUri?: string): Promise<any> {
    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    const callback = redirectUri || env.INSTAGRAM_REDIRECT_URI || `${env.BACKEND_URL}/api/instagram/callback`;

    if (!appId || !appSecret) {
      throw new Error("Meta App ID or App Secret is not configured");
    }

    // 1. Exchange code for short-lived access token
    const tokenRes = await axios.get(`${GRAPH_API_BASE}/oauth/access_token`, {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: callback,
        code,
      },
    });

    const shortLivedToken = tokenRes.data.access_token;

    // 2. Exchange short-lived token for 60-day long-lived token
    const longLivedRes = await axios.get(`${GRAPH_API_BASE}/oauth/access_token`, {
      params: {
        grant_type: "fb_exchange_token",
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    const longLivedToken = longLivedRes.data.access_token;
    const expiresInSeconds = longLivedRes.data.expires_in || 5184000; // default 60 days
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // 3. Find connected Facebook Pages and linked Instagram Business Account
    const pagesRes = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
      params: {
        access_token: longLivedToken,
        fields: "id,name,instagram_business_account{id,username,name,profile_picture_url,followers_count,follows_count,media_count}",
      },
    });

    let igAccountData: any = null;
    let pageId: string = "";

    if (pagesRes.data?.data) {
      for (const page of pagesRes.data.data) {
        if (page.instagram_business_account) {
          igAccountData = page.instagram_business_account;
          pageId = page.id;
          break;
        }
      }
    }

    if (!igAccountData) {
      throw new Error(
        "No linked Instagram Professional (Business or Creator) account found on your Facebook Pages. Please ensure your Instagram account is switched to Professional and connected to a Facebook Page."
      );
    }

    return {
      instagramId: igAccountData.id,
      username: igAccountData.username,
      name: igAccountData.name || igAccountData.username,
      profilePictureUrl: igAccountData.profile_picture_url || "",
      followersCount: igAccountData.followers_count || 0,
      followsCount: igAccountData.follows_count || 0,
      mediaCount: igAccountData.media_count || 0,
      accessToken: longLivedToken,
      tokenExpiresAt: expiresAt,
      pageId,
    };
  }

  /**
   * Publishes an Instagram Reel using Meta Graph API Container Workflow
   */
  public static async publishReel(params: InstagramPublishParams): Promise<PublishResult> {
    const account = await InstagramAccount.findById(params.accountId);
    if (!account) {
      return { success: false, statusMessage: "Instagram account record not found in database." };
    }

    if (!account.isConnected || !account.accessTokenEncrypted) {
      return { success: false, statusMessage: "Instagram account is disconnected. Please re-authenticate." };
    }

    const accessToken = decryptSensitive(account.accessTokenEncrypted);
    const igUserId = account.instagramId;

    try {
      // Step 1: Create Video/Reel Container
      const createContainerRes = await axios.post(
        `${GRAPH_API_BASE}/${igUserId}/media`,
        null,
        {
          params: {
            access_token: accessToken,
            media_type: "REELS",
            video_url: params.mediaUrl,
            caption: params.caption,
            share_to_feed: params.shareToFeed !== false,
            ...(params.coverImageUrl ? { cover_url: params.coverImageUrl } : {}),
          },
        }
      );

      const containerId = createContainerRes.data.id;
      if (!containerId) {
        return {
          success: false,
          statusMessage: "Failed to create Instagram media container.",
        };
      }

      // Step 2: Poll container status until FINISHED or ERROR (timeout after 120s)
      let status = "IN_PROGRESS";
      let attempts = 0;
      const maxAttempts = 24; // 24 * 5s = 120s

      while (status === "IN_PROGRESS" && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;

        const statusRes = await axios.get(`${GRAPH_API_BASE}/${containerId}`, {
          params: {
            access_token: accessToken,
            fields: "status_code,status",
          },
        });

        status = statusRes.data.status_code || statusRes.data.status;
      }

      if (status !== "FINISHED") {
        return {
          success: false,
          containerId,
          statusMessage: `Media processing did not finish within timeout (status: ${status}).`,
        };
      }

      // Step 3: Publish Container
      const publishRes = await axios.post(
        `${GRAPH_API_BASE}/${igUserId}/media_publish`,
        null,
        {
          params: {
            access_token: accessToken,
            creation_id: containerId,
          },
        }
      );

      const publishedMediaId = publishRes.data.id;

      // Get permalink
      let permalink = "";
      try {
        const mediaInfo = await axios.get(`${GRAPH_API_BASE}/${publishedMediaId}`, {
          params: {
            access_token: accessToken,
            fields: "permalink",
          },
        });
        permalink = mediaInfo.data.permalink || "";
      } catch (e) {
        // Non-critical if permalink fetch fails
      }

      return {
        success: true,
        instagramPostId: publishedMediaId,
        containerId,
        permalink,
        statusMessage: "Successfully published to Instagram!",
      };
    } catch (err: any) {
      const metaError = err.response?.data?.error?.message || err.message;
      return {
        success: false,
        error: metaError,
        statusMessage: `Instagram Publishing Error: ${metaError}`,
      };
    }
  }

  /**
   * Fetches official account insights (impressions, reach, profile views)
   */
  public static async getAccountInsights(accountId: string): Promise<any> {
    const account = await InstagramAccount.findById(accountId);
    if (!account) throw new Error("Account not found");

    const accessToken = decryptSensitive(account.accessTokenEncrypted);
    const igUserId = account.instagramId;

    try {
      const res = await axios.get(`${GRAPH_API_BASE}/${igUserId}/insights`, {
        params: {
          access_token: accessToken,
          metric: "impressions,reach",
          period: "day",
        },
      });
      return res.data;
    } catch (err: any) {
      console.warn("Meta insights request failed:", err.response?.data || err.message);
      return null;
    }
  }
}
