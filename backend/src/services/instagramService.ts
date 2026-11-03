import axios from "axios";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { InstagramAccount } from "../models/InstagramAccount";
import { decryptSensitive, encryptSensitive } from "../utils/encryption";
import { ActivityLog } from "../models/ActivityLog";
import { env } from "../config/env";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export interface OAuthStatePayload {
  userId: string;
  nonce: string;
  type: "meta_instagram_oauth";
}

export function generateOAuthState(userId: string): string {
  return jwt.sign(
    {
      userId,
      nonce: crypto.randomBytes(16).toString("hex"),
      type: "meta_instagram_oauth",
    },
    env.JWT_SECRET,
    { expiresIn: "15m" }
  );
}

export function verifyOAuthState(state: string): { userId: string } {
  try {
    const decoded = jwt.verify(state, env.JWT_SECRET) as OAuthStatePayload;
    if (!decoded || decoded.type !== "meta_instagram_oauth" || !decoded.userId) {
      throw new Error("Invalid OAuth state payload structure");
    }
    return { userId: decoded.userId };
  } catch (err: any) {
    throw new Error(`OAuth state verification failed: ${err.message}`);
  }
}

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
  public static getOAuthUrl(userId?: string, redirectUri?: string): string {
    const appId = process.env.INSTAGRAM_APP_ID;
    if (!appId) {
      throw new Error("INSTAGRAM_APP_ID is not configured in environment or settings");
    }

    const callback = redirectUri || env.INSTAGRAM_REDIRECT_URI || `${env.BACKEND_URL}/api/instagram/callback`;
    const configId = process.env.INSTAGRAM_CONFIG_ID;
    const state = userId ? generateOAuthState(userId) : "";

    // If config_id is provided, Meta's Facebook Login for Business configuration defines the flow
    if (configId) {
      return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
        callback
      )}&config_id=${configId}&state=${state}&response_type=code`;
    }

    const scopes = [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
    ].join(",");

    return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      callback
    )}&scope=${encodeURIComponent(scopes)}&state=${state}&response_type=code`;
  }

  /**
   * Exchanges authorization code for long-lived access token, verifies linked Instagram account,
   * encrypts token with AES-256-GCM, and stores it in MongoDB linked to user.
   */
  public static async handleOAuthCallback(
    code: string,
    userId: string,
    redirectUri?: string,
    userEmail?: string
  ): Promise<any> {
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

    const shortLivedToken = tokenRes.data?.access_token;
    if (!shortLivedToken) {
      throw new Error("Failed to receive access token from Meta OAuth exchange");
    }

    // 2. Exchange short-lived token for 60-day long-lived token
    let longLivedToken = shortLivedToken;
    let expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    try {
      const longLivedRes = await axios.get(`${GRAPH_API_BASE}/oauth/access_token`, {
        params: {
          grant_type: "fb_exchange_token",
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: shortLivedToken,
        },
      });

      if (longLivedRes.data?.access_token) {
        longLivedToken = longLivedRes.data.access_token;
        const expiresInSeconds = longLivedRes.data.expires_in || 5184000;
        expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
      }
    } catch (exchangeErr: any) {
      console.warn("Could not exchange for long-lived token, utilizing short-lived token:", exchangeErr.message);
    }

    // 3. Find connected Facebook Pages and linked Instagram Business Account
    const pagesRes = await axios.get(`${GRAPH_API_BASE}/me/accounts`, {
      params: {
        access_token: longLivedToken,
        fields: "id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,follows_count,media_count}",
      },
    });

    let igAccountData: any = null;
    let pageId: string = "";

    if (pagesRes.data?.data && Array.isArray(pagesRes.data.data)) {
      for (const page of pagesRes.data.data) {
        if (page.instagram_business_account) {
          igAccountData = page.instagram_business_account;
          pageId = page.id;
          break;
        }
      }
    }

    // Secondary fallback check if not in /me/accounts
    if (!igAccountData) {
      try {
        const meRes = await axios.get(`${GRAPH_API_BASE}/me`, {
          params: {
            access_token: longLivedToken,
            fields: "id,name,accounts{id,name,instagram_business_account{id,username,name,profile_picture_url,followers_count,follows_count,media_count}}",
          },
        });
        const accountsList = meRes.data?.accounts?.data;
        if (accountsList && Array.isArray(accountsList)) {
          for (const page of accountsList) {
            if (page.instagram_business_account) {
              igAccountData = page.instagram_business_account;
              pageId = page.id;
              break;
            }
          }
        }
      } catch (meErr: any) {
        console.warn("Secondary accounts check failed:", meErr.message);
      }
    }

    if (!igAccountData || !igAccountData.id) {
      throw new Error(
        "No linked Instagram Professional (Business or Creator) account found on your Facebook Pages. Please ensure: 1) Your Instagram account is switched to Professional in the Instagram app, and 2) It is linked to a Facebook Page in Meta Business Suite."
      );
    }

    // 4. Encrypt access token before storing in MongoDB
    const accessTokenEncrypted = encryptSensitive(longLivedToken);

    // 5. Upsert InstagramAccount record linked to user
    const permissions = [
      "instagram_basic",
      "instagram_content_publish",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
    ];

    const account = await InstagramAccount.findOneAndUpdate(
      { instagramId: igAccountData.id },
      {
        $set: {
          userId,
          username: igAccountData.username,
          name: igAccountData.name || igAccountData.username,
          accountType: "BUSINESS",
          profilePictureUrl: igAccountData.profile_picture_url || "",
          followersCount: igAccountData.followers_count || 0,
          followsCount: igAccountData.follows_count || 0,
          mediaCount: igAccountData.media_count || 0,
          accessTokenEncrypted,
          tokenExpiresAt: expiresAt,
          pageId,
          isConnected: true,
          lastSyncedAt: new Date(),
          permissions,
        },
      },
      { upsert: true, new: true }
    );

    // 6. Record activity log
    await ActivityLog.create({
      action: "INSTAGRAM_ACCOUNT_CONNECTED",
      performedBy: userEmail || userId,
      entityType: "InstagramAccount",
      entityId: account._id.toString(),
      status: "success",
      details: {
        username: account.username,
        instagramId: account.instagramId,
        pageId,
      },
    });

    return account;
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

