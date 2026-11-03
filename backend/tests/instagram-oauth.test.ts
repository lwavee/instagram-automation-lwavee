import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import axios from "axios";
import { createApp } from "../src/app";
import {
  InstagramService,
  generateOAuthState,
  verifyOAuthState,
} from "../src/services/instagramService";
import { InstagramAccount } from "../src/models/InstagramAccount";
import { User } from "../src/models/User";
import { ActivityLog } from "../src/models/ActivityLog";
import { generateToken } from "../src/middleware/auth";
import { decryptSensitive } from "../src/utils/encryption";

// Mock axios for Meta Graph API calls
vi.mock("axios");

describe("Instagram OAuth Connection & Security", () => {
  const testUserId = "67c740000000000000000001";
  const testEmail = "test-oauth@learnwithavee.com";
  const authToken = generateToken({
    userId: testUserId,
    email: testEmail,
    role: "admin",
  });

  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INSTAGRAM_APP_ID = "1442580534699263";
    process.env.INSTAGRAM_APP_SECRET = "ef88638e3461ecf520d223c2ce554c0b";
    process.env.INSTAGRAM_CONFIG_ID = "1593211899139986";
    process.env.INSTAGRAM_REDIRECT_URI = "http://localhost:5000/api/instagram/callback";

    // Mock DB operations so tests run instantly and unit-tested in isolation
    vi.spyOn(User, "findById").mockImplementation((id: any) =>
      Promise.resolve({
        _id: id,
        email: testEmail,
        name: "Test Avee",
        isActive: true,
      } as any)
    );

    vi.spyOn(InstagramAccount, "findOneAndUpdate").mockImplementation((query: any, update: any) => {
      const data = {
        _id: "67c740000000000000000002",
        instagramId: query.instagramId,
        username: update.$set.username,
        name: update.$set.name,
        accountType: update.$set.accountType,
        followersCount: update.$set.followersCount,
        isConnected: update.$set.isConnected,
        accessTokenEncrypted: update.$set.accessTokenEncrypted,
        permissions: update.$set.permissions,
        toJSON: function () {
          const ret = { ...this };
          delete (ret as any).accessTokenEncrypted;
          return ret;
        },
      };
      return Promise.resolve(data as any);
    });

    vi.spyOn(InstagramAccount, "findOne").mockReturnValue({
      sort: () =>
        Promise.resolve({
          _id: "67c740000000000000000002",
          instagramId: "17841400011223344",
          username: "learnwithavee",
          name: "Learn With Avee",
          accountType: "BUSINESS",
          followersCount: 5240,
          followsCount: 120,
          mediaCount: 85,
          isConnected: true,
          permissions: [
            "instagram_basic",
            "instagram_content_publish",
            "instagram_manage_insights",
            "pages_show_list",
            "pages_read_engagement",
          ],
        }),
    } as any);

    vi.spyOn(InstagramAccount, "updateMany").mockResolvedValue({ acknowledged: true, modifiedCount: 1 } as any);
    vi.spyOn(ActivityLog, "create").mockResolvedValue({} as any);
  });

  describe("OAuth URL & State Cryptography", () => {
    it("generates a valid Meta OAuth URL with configuration ID and signed state", () => {
      const url = InstagramService.getOAuthUrl(testUserId);

      expect(url).toContain("https://www.facebook.com/v21.0/dialog/oauth");
      expect(url).toContain("client_id=1442580534699263");
      expect(url).toContain("config_id=1593211899139986");
      expect(url).toContain("response_type=code");
      expect(url).toContain("state=");
    });

    it("falls back to explicit scopes if config_id is not configured", () => {
      delete process.env.INSTAGRAM_CONFIG_ID;
      const url = InstagramService.getOAuthUrl(testUserId);

      expect(url).not.toContain("config_id=");
      expect(url).toContain("scope=");
      expect(url).toContain("instagram_basic");
      expect(url).toContain("instagram_content_publish");
    });

    it("throws error if INSTAGRAM_APP_ID is missing", () => {
      delete process.env.INSTAGRAM_APP_ID;
      expect(() => InstagramService.getOAuthUrl(testUserId)).toThrow(
        /INSTAGRAM_APP_ID is not configured/
      );
    });

    it("cryptographically signs and verifies OAuth state with 15-minute expiry", () => {
      const state = generateOAuthState(testUserId);
      expect(state).toBeDefined();

      const decoded = verifyOAuthState(state);
      expect(decoded.userId).toBe(testUserId);
    });

    it("rejects tampered or forged OAuth state", () => {
      const state = generateOAuthState(testUserId);
      const tampered = state.slice(0, -5) + "abcde";

      expect(() => verifyOAuthState(tampered)).toThrow(/OAuth state verification failed/);
    });

    it("rejects invalid non-JWT string state", () => {
      expect(() => verifyOAuthState("fake-state-12345")).toThrow(
        /OAuth state verification failed/
      );
    });
  });

  describe("API Endpoints — GET /api/instagram/auth-url", () => {
    it("requires authentication to generate auth URL", async () => {
      const res = await request(app).get("/api/instagram/auth-url");
      expect(res.status).toBe(401);
    });

    it("returns 200 with Meta OAuth URL for authenticated users", async () => {
      const res = await request(app)
        .get("/api/instagram/auth-url")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.url).toContain("facebook.com/v21.0/dialog/oauth");
      expect(res.body.data.url).toContain("config_id=1593211899139986");
    });
  });

  describe("API Endpoints — GET /api/instagram/callback", () => {
    it("redirects to frontend with error when Meta returns an authorization error", async () => {
      const res = await request(app).get("/api/instagram/callback").query({
        error: "access_denied",
        error_description: "User denied authorization",
      });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("/integrations?error=");
      expect(res.headers.location).toContain("User%20denied%20authorization");
    });

    it("redirects to frontend with error when code or state is missing", async () => {
      const res = await request(app).get("/api/instagram/callback").query({
        code: "test_code_without_state",
      });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("/integrations?error=");
      expect(res.headers.location).toContain("Missing%20authorization%20code");
    });

    it("redirects to frontend with security error when state verification fails", async () => {
      const res = await request(app).get("/api/instagram/callback").query({
        code: "valid_code_123",
        state: "invalid_forged_state",
      });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("/integrations?error=");
      expect(res.headers.location).toContain("Security%20verification%20failed");
    });

    it("completes full OAuth exchange and redirects to frontend with connected=true on success", async () => {
      const validState = generateOAuthState(testUserId);
      const mockShortToken = "short_lived_tok_123";
      const mockLongToken = "long_lived_tok_456";

      (axios.get as any)
        .mockResolvedValueOnce({
          data: { access_token: mockShortToken },
        })
        .mockResolvedValueOnce({
          data: { access_token: mockLongToken, expires_in: 5184000 },
        })
        .mockResolvedValueOnce({
          data: {
            data: [
              {
                id: "page_123",
                name: "Learn With Avee",
                instagram_business_account: {
                  id: "17841400011223344",
                  username: "learnwithavee",
                  followers_count: 5240,
                },
              },
            ],
          },
        });

      const res = await request(app).get("/api/instagram/callback").query({
        code: "valid_meta_auth_code_999",
        state: validState,
      });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("/integrations?connected=true&username=learnwithavee");
    });
  });

  describe("OAuth Code Exchange, Token Encryption & Account Storage", () => {
    it("handles full OAuth code exchange, fetches Instagram account, encrypts token and saves to DB", async () => {
      const mockShortLivedToken = "EAAB_SHORT_LIVED_TOKEN_12345";
      const mockLongLivedToken = "EAAB_LONG_LIVED_TOKEN_67890_EXCHANGE_RESULT";

      const mockPagesResponse = {
        data: {
          data: [
            {
              id: "page_123456789",
              name: "Learn With Avee FB Page",
              access_token: "page_token_abc",
              instagram_business_account: {
                id: "17841400011223344",
                username: "learnwithavee",
                name: "Learn With Avee",
                profile_picture_url: "https://example.com/avee_profile.jpg",
                followers_count: 5240,
                follows_count: 120,
                media_count: 85,
              },
            },
          ],
        },
      };

      (axios.get as any)
        .mockResolvedValueOnce({
          data: { access_token: mockShortLivedToken, token_type: "bearer" },
        })
        .mockResolvedValueOnce({
          data: {
            access_token: mockLongLivedToken,
            token_type: "bearer",
            expires_in: 5184000,
          },
        })
        .mockResolvedValueOnce(mockPagesResponse);

      const account = await InstagramService.handleOAuthCallback(
        "test_auth_code_from_meta",
        testUserId,
        undefined,
        testEmail
      );

      expect(account).toBeDefined();
      expect(account.instagramId).toBe("17841400011223344");
      expect(account.username).toBe("learnwithavee");
      expect(account.followersCount).toBe(5240);
      expect(account.isConnected).toBe(true);

      // Verify token is encrypted in DB
      expect(account.accessTokenEncrypted).toBeDefined();
      expect(account.accessTokenEncrypted).not.toBe(mockLongLivedToken);
      expect(account.accessTokenEncrypted).toContain(":");

      // Verify it decrypts back to the exact long-lived token
      const decrypted = decryptSensitive(account.accessTokenEncrypted);
      expect(decrypted).toBe(mockLongLivedToken);

      // Verify toJSON() excludes encrypted token from API responses
      const jsonObj = account.toJSON();
      expect(jsonObj.accessTokenEncrypted).toBeUndefined();
    });

    it("throws informative error when no linked Instagram Professional account is found", async () => {
      (axios.get as any)
        .mockResolvedValueOnce({
          data: { access_token: "short_token" },
        })
        .mockResolvedValueOnce({
          data: { access_token: "long_token" },
        })
        .mockResolvedValueOnce({
          data: {
            data: [
              {
                id: "page_without_ig",
                name: "Empty FB Page",
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: { accounts: { data: [] } },
        });

      await expect(
        InstagramService.handleOAuthCallback(
          "code_no_ig",
          testUserId,
          undefined,
          testEmail
        )
      ).rejects.toThrow(/No linked Instagram Professional.*account found/);
    });
  });

  describe("API Endpoints — GET /api/instagram/account & Disconnect", () => {
    it("returns account info without exposing secrets", async () => {
      const res = await request(app)
        .get("/api/instagram/account")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isConnected).toBe(true);
      expect(res.body.data.account.username).toBe("learnwithavee");
      expect(res.body.data.account.accessTokenEncrypted).toBeUndefined();
      expect(res.body.data.account.accessToken).toBeUndefined();
    });

    it("disconnects Instagram account successfully", async () => {
      const res = await request(app)
        .post("/api/instagram/disconnect")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain("disconnected");
    });
  });
});
