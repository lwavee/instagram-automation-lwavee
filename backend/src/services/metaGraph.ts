import axios from "axios";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../config/env";

export const metaPermissions = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
] as const;

export function requiredMetaPermissions() {
  return env.META_BUSINESS_MANAGER_AD_SCOPES ? [...metaPermissions, "ads_management", "ads_read"] : [...metaPermissions];
}

export function readDeauthorization(signedRequest: unknown, appSecret?: string) {
  if (!appSecret || typeof signedRequest !== "string" || signedRequest.length > 4096) return null;
  const parts = signedRequest.split(".");
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return null;
  const [signature, payload] = parts;
  const received = Buffer.from(signature, "base64url");
  const expected = createHmac("sha256", appSecret).update(payload).digest();
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.algorithm !== "HMAC-SHA256" || typeof data.user_id !== "string" ||
        !/^\d+$/.test(data.user_id) || !Number.isSafeInteger(data.issued_at) ||
        data.issued_at <= 0 || data.issued_at > Math.floor(Date.now() / 1000) + 60) return null;
    return { userId: data.user_id as string, issuedAt: new Date(data.issued_at * 1000 + 999) };
  } catch { return null; }
}

export class MetaError extends Error {
  constructor(
    message: string,
    readonly retryable = false,
    readonly authorization = false,
    readonly uncertain = false,
  ) {
    super(message);
  }
}

export function graphBase() {
  if (!env.META_GRAPH_API_VERSION) throw new MetaError("Configure META_GRAPH_API_VERSION before using Meta.");
  return "https://graph.facebook.com/" + env.META_GRAPH_API_VERSION;
}

type Fields = Record<string, string | boolean | number>;

export async function graph<T>(method: "GET" | "POST", path: string, fields: Fields, token?: string) {
  const base = graphBase();
  const proof = token && !token.includes("|") && env.META_APP_SECRET
    ? createHmac("sha256", env.META_APP_SECRET).update(token).digest("hex")
    : undefined;
  const payload = { ...fields, ...(proof && { appsecret_proof: proof }) };
  try {
    const response = await axios.request<T>({
      method,
      url: base + path,
      timeout: 15000,
      maxRedirects: 0,
      headers: token ? { Authorization: "Bearer " + token } : undefined,
      params: method === "GET" ? payload : undefined,
      data: method === "POST" ? new URLSearchParams(Object.entries(payload).map(([key, value]): [string, string] => [key, String(value)])) : undefined,
    });
    return response.data;
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    const response = error.response;
    const upstream = response?.data?.error;
    const code = Number(upstream?.code);
    const subcode = Number(upstream?.error_subcode);
    const trace = typeof upstream?.fbtrace_id === "string" && /^[\w-]{1,100}$/.test(upstream.fbtrace_id)
      ? " Reference " + upstream.fbtrace_id + "."
      : "";
    const authorization = [10, 102, 190, 200, 294].includes(code) || response?.status === 401 || response?.status === 403;
    const uncertain = !response || response.status >= 500;
    const retryable = !authorization && (uncertain || response?.status === 429 ||
      upstream?.is_transient === true || [4, 17, 32, 613].includes(code));
    const identifiers = Number.isFinite(code)
      ? " (code " + code + (Number.isFinite(subcode) ? ", subcode " + subcode : "") + ")"
      : "";
    const reason = authorization ? "Meta authorization was rejected. Check Page access and reconnect."
      : retryable ? "Meta is temporarily unavailable or rate-limiting requests."
      : "Meta rejected the request" + identifiers + ". Check the asset and media requirements.";
    throw new MetaError(reason + trace, retryable, authorization, uncertain);
  }
}

