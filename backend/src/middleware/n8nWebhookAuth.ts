import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { env } from "../config/env";

export function verifyN8nWebhook(req: Request, res: Response, next: NextFunction): void {
  const incomingSecret = (req.headers["x-n8n-secret"] || req.headers["x-webhook-secret"]) as string | undefined;
  const signature = req.headers["x-n8n-signature"] as string | undefined;

  const expectedSecret = env.N8N_WEBHOOK_SECRET;

  // Direct secret match verification (timing-safe)
  if (incomingSecret) {
    const incomingBuf = Buffer.from(incomingSecret);
    const expectedBuf = Buffer.from(expectedSecret);

    if (
      incomingBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(incomingBuf, expectedBuf)
    ) {
      return next();
    }
  }

  // HMAC SHA-256 signature verification if payload signed
  if (signature && req.body) {
    const rawBody = JSON.stringify(req.body);
    const computedSignature = crypto
      .createHmac("sha256", expectedSecret)
      .update(rawBody)
      .digest("hex");

    const sigBuf = Buffer.from(signature);
    const compBuf = Buffer.from(computedSignature);

    if (sigBuf.length === compBuf.length && crypto.timingSafeEqual(sigBuf, compBuf)) {
      return next();
    }
  }

  res.status(401).json({
    success: false,
    error: { message: "Unauthorized: Invalid or missing n8n webhook authentication credentials." },
  });
}

