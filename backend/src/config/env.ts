import dotenv from "dotenv";
import { z } from "zod";

if (process.env.NODE_ENV !== "test") dotenv.config();

// Auto-detect production environment on Render if NODE_ENV was not explicitly passed
if (process.env.RENDER === "true" && process.env.NODE_ENV !== "test") {
  process.env.NODE_ENV = "production";
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default(process.env.RENDER === "true" ? "production" : "development"),
  PORT: z
    .union([z.string(), z.number()])
    .default("5000")
    .transform((val) => (typeof val === "number" ? val : parseInt(val, 10))),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/learn_with_avee"),
  JWT_SECRET: z.string().default("development_jwt_secret_must_be_32_characters_minimum_len"),
  APP_ENCRYPTION_KEY: z.string().default("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  BACKEND_URL: z.string().url().default("http://localhost:5000"),
  N8N_BASE_URL: z.string().default("http://localhost:5678"),
  N8N_WEBHOOK_SECRET: z.string().optional(),
  SCHEDULER_SECRET: z.string().optional(),
  ALLOW_REGISTRATION: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  META_GRAPH_API_VERSION: z.string().regex(/^v\d+\.\d+$/).optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_LOGIN_CONFIG_ID: z.string().optional(),
  META_REDIRECT_URI: z.string().url().optional(),
  META_INSTAGRAM_USERNAME: z.string().regex(/^@?[a-zA-Z0-9_.]{1,30}$/).optional(),
  META_FACEBOOK_PAGE_ID: z.string().regex(/^\d+$/).optional(),
  META_BUSINESS_MANAGER_AD_SCOPES: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  YOUTUBE_OAUTH_CLIENT_ID: z.string().optional(),
  YOUTUBE_OAUTH_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_OAUTH_REDIRECT_URI: z.string().url().optional(),
  DEFAULT_AI_PROVIDER: z.enum(["gemini", "openai", "openrouter"]).default("gemini"),
  DEFAULT_AI_MODEL: z.string().default("gemini-3.1-flash-lite"),
  GEMINI_VIDEO_MODEL: z.string().default("gemini-omni-1.2-flash"),
  YOUTUBE_DATA_API_KEY: z.string().optional(),
  CREATOR_NICHE: z.string().default("AI tools, software tutorials, cybersecurity, and web development for Indian students and creators"),
  MEDIA_STORAGE_PROVIDER: z.enum(["local", "cloudinary", "supabase"]).default("local"),
  CLOUDINARY_URL: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables configuration:", parsed.error.format());
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

export const env = parsed.success ? parsed.data : envSchema.parse({});

if (env.NODE_ENV === "production") {
  for (const key of ["JWT_SECRET", "APP_ENCRYPTION_KEY"] as const) {
    const value = process.env[key];
    if (!value || value.length < 32 || value === envSchema.parse({})[key]) {
      throw new Error(`${key} must be configured with a unique production secret.`);
    }
  }
  const oldMachineSecrets = ["development_scheduler_secret_key_change_in_production", "dev_webhook_secret_for_n8n_integration"];
  for (const key of ["SCHEDULER_SECRET", "N8N_WEBHOOK_SECRET"] as const) {
    const secret = env[key];
    if (secret && (secret.length < 32 || oldMachineSecrets.includes(secret))) {
      throw new Error(`${key} must be a unique production secret.`);
    }
  }
}
