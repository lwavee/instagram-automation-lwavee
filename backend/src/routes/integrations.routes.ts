import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { AIProviderConfig } from "../models/AIProviderConfig";
import { AIService } from "../services/aiService";
import { encryptSensitive, maskSecret } from "../utils/encryption";
import { ActivityLog } from "../models/ActivityLog";

const router = Router();

const saveAiConfigSchema = z.object({
  provider: z.enum(["gemini", "openai", "openrouter"]),
  apiKey: z.string().min(1, "API Key is required"),
  defaultModel: z.string().min(1),
  availableModels: z.array(z.string()).optional(),
  isEnabled: z.boolean().default(true),
});

const testAiConnectionSchema = z.object({
  provider: z.enum(["gemini", "openai", "openrouter"]),
  apiKey: z.string().min(1),
  model: z.string().optional(),
});

// GET /api/integrations/ai-providers
router.get(
  "/ai-providers",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const configs = await AIProviderConfig.find();

      // Return configurations with masked secrets
      const providers = ["gemini", "openai", "openrouter"].map((provider) => {
        const found = configs.find((c) => c.provider === provider);
        const hasEnvKey = Boolean(
          (provider === "gemini" && process.env.GEMINI_API_KEY) ||
            (provider === "openai" && process.env.OPENAI_API_KEY) ||
            (provider === "openrouter" && process.env.OPENROUTER_API_KEY)
        );

        return {
          provider,
          isEnabled: found ? found.isEnabled : hasEnvKey,
          isConfigured: Boolean(found?.apiKeyEncrypted || hasEnvKey),
          isTestedSuccessfully: found ? found.isTestedSuccessfully : false,
          lastTestedAt: found?.lastTestedAt,
          defaultModel:
            found?.defaultModel ||
            (provider === "gemini" ? "gemini-3.1-flash-lite" : provider === "openai" ? "gpt-4o-mini" : "meta-llama/llama-3.3-70b-instruct"),
          availableModels: found?.availableModels?.length
            ? found.availableModels
            : provider === "gemini"
            ? ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.5-flash"]
            : provider === "openai"
            ? ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"]
            : ["meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-r1", "anthropic/claude-3.5-sonnet"],
          maskedKey: found?.apiKeyEncrypted ? "••••••••••••••••" : hasEnvKey ? "Configured in Environment" : "",
        };
      });

      res.json({ success: true, data: { providers } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/integrations/ai-providers/test
router.post(
  "/ai-providers/test",
  authenticateToken,
  validate(testAiConnectionSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { provider, apiKey, model } = req.body;
      const testResult = await AIService.testProviderConnection(provider, apiKey, model);

      res.json({
        success: testResult.success,
        data: testResult,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/integrations/ai-providers/save
router.post(
  "/ai-providers/save",
  authenticateToken,
  validate(saveAiConfigSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { provider, apiKey, defaultModel, availableModels, isEnabled } = req.body;

      // Test connection before saving
      const testResult = await AIService.testProviderConnection(provider, apiKey, defaultModel);

      const apiKeyEncrypted = encryptSensitive(apiKey);

      const config = await AIProviderConfig.findOneAndUpdate(
        { provider },
        {
          $set: {
            apiKeyEncrypted,
            defaultModel,
            availableModels: availableModels || [defaultModel],
            isEnabled,
            isTestedSuccessfully: testResult.success,
            lastTestedAt: new Date(),
            testError: testResult.success ? "" : testResult.message,
          },
        },
        { upsert: true, new: true }
      );

      await ActivityLog.create({
        action: "AI_PROVIDER_CONFIG_SAVED",
        performedBy: req.user!.email,
        details: { provider, defaultModel, testSuccess: testResult.success },
        status: testResult.success ? "success" : "failure",
      });

      res.json({
        success: true,
        data: {
          config,
          testResult,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

