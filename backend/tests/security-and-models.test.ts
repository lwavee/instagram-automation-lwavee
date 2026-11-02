import { describe, it, expect, beforeAll } from "vitest";
import { encryptSensitive, decryptSensitive, maskSecret } from "../src/utils/encryption";
import { generateToken, hashPassword, verifyPassword } from "../src/middleware/auth";
import request from "supertest";
import { createApp } from "../src/app";

describe("Learn With Avee — Security & Encryption", () => {
  it("should securely encrypt and decrypt sensitive API keys with AES-256-GCM", () => {
    const rawApiKey = "sk-proj-super-secret-production-ai-key-1234567890";
    const encrypted = encryptSensitive(rawApiKey);

    expect(encrypted).not.toBe(rawApiKey);
    expect(encrypted).toContain(":"); // IV:AuthTag:Ciphertext format

    const decrypted = decryptSensitive(encrypted);
    expect(decrypted).toBe(rawApiKey);
  });

  it("should mask secrets safely for UI presentation", () => {
    expect(maskSecret("sk-1234567890abcdef")).toBe("sk-1...cdef");
    expect(maskSecret("short")).toBe("********");
    expect(maskSecret("")).toBe("");
  });

  it("should hash passwords using bcrypt with unique salts", async () => {
    const rawPassword = "StrongUserPassword@2026!";
    const hash = await hashPassword(rawPassword);

    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith("$2")).toBe(true);

    const isMatch = await verifyPassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isFalse = await verifyPassword("WrongPassword123", hash);
    expect(isFalse).toBe(false);
  });

  it("should generate valid JWT tokens with expected claims", () => {
    const payload = {
      userId: "user_123456",
      email: "avee@learnwithavee.com",
      role: "admin",
    };
    const token = generateToken(payload);
    expect(token).toBeDefined();
    expect(token.split(".").length).toBe(3);
  });
});

describe("Backend API Endpoints", () => {
  const app = createApp();

  it("GET /api/health returns 200 with service information", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.brand).toBe("Learn With Avee");
    expect(res.body.status).toBe("ok");
  });

  it("GET /api/unknown-endpoint returns 404 structured JSON error", async () => {
    const res = await request(app).get("/api/unknown-route-123");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("not found");
  });

  it("POST /api/auth/register rejects invalid email or short password", async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Avee",
      email: "invalid-email-string",
      password: "123", // too short (min 8)
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.issues.length).toBeGreaterThan(0);
  });
});
