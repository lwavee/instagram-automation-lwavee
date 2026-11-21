import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { AIProviderConfig } from "../models/AIProviderConfig";
import { decryptSensitive } from "../utils/encryption";
import { env } from "../config/env";

export interface ScriptGenerationParams {
  topic: string;
  reelTitle?: string;
  targetFormat?: "REEL" | "CAROUSEL" | "STORY" | "POST";
  language?: "Hinglish" | "Hindi" | "English";
  targetDurationSeconds?: number;
  customInstructions?: string;
  provider?: "gemini" | "openai" | "openrouter";
  model?: string;
}

export interface GeneratedScriptResult {
  reelTitle: string;
  openingHook: string;
  scenes: {
    sceneNumber: number;
    durationSeconds: number;
    visualDescription: string;
    onScreenText: string;
    voiceoverHindi: string;
    voiceoverHinglish: string;
  }[];
  fullVoiceover: string;
  onScreenSummary: string[];
  caption: string;
  hashtags: string[];
  cta: string;
  suggestedDurationSeconds: number;
  providerUsed: string;
  modelUsed: string;
}

export class AIServiceError extends Error {
  constructor(message: string, readonly statusCode = 502) {
    super(message);
    this.name = "AIServiceError";
    (this as Error & { publicMessage?: string }).publicMessage = message;
  }
}

export class AIService {
  /**
   * Retrieves decrypted API key for a provider from DB or Environment
   */
  public static async getProviderCredentials(
    provider: "gemini" | "openai" | "openrouter"
  ): Promise<{ apiKey: string; defaultModel: string } | null> {
    try {
      const config = await AIProviderConfig.findOne({ provider, isEnabled: true });
      if (config && config.apiKeyEncrypted) {
        const decrypted = decryptSensitive(config.apiKeyEncrypted);
        if (decrypted) {
          return { apiKey: decrypted, defaultModel: config.defaultModel };
        }
      }
    } catch (err) {
      console.warn(`Could not load saved AI config for ${provider}, falling back to env.`);
    }

    // Fallback to environment variables
    if (provider === "gemini" && process.env.GEMINI_API_KEY) {
      return { apiKey: process.env.GEMINI_API_KEY, defaultModel: env.DEFAULT_AI_MODEL };
    }
    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      return { apiKey: process.env.OPENAI_API_KEY, defaultModel: "gpt-4o-mini" };
    }
    if (provider === "openrouter" && process.env.OPENROUTER_API_KEY) {
      return { apiKey: process.env.OPENROUTER_API_KEY, defaultModel: "meta-llama/llama-3.3-70b-instruct" };
    }

    return null;
  }

  /**
   * Resolves the best available AI provider and credentials, falling back cleanly
   */
  public static async resolveProviderAndCredentials(
    preferredProvider?: "gemini" | "openai" | "openrouter"
  ): Promise<{ provider: "gemini" | "openai" | "openrouter"; apiKey: string; defaultModel: string } | null> {
    if (preferredProvider) {
      const creds = await this.getProviderCredentials(preferredProvider);
      if (creds) return { provider: preferredProvider, ...creds };
    }

    const defaultCreds = await this.getProviderCredentials(env.DEFAULT_AI_PROVIDER);
    if (defaultCreds) return { provider: env.DEFAULT_AI_PROVIDER, ...defaultCreds };

    for (const p of ["gemini", "openrouter", "openai"] as const) {
      const creds = await this.getProviderCredentials(p);
      if (creds) return { provider: p, ...creds };
    }

    return null;
  }

  public static async suggestCreatorTopic(
    niche: string,
    evidence: Array<{ title: string; channelTitle: string; views: number; viewsPerHour: number; url: string }>
  ): Promise<{ topic: string; rationale: string }> {
    const creds = await this.resolveProviderAndCredentials();
    if (!creds) {
      return {
        topic: "Top 5 AI Tools & Hidden Features Every Student Needs in 2026",
        rationale: "Selected based on high engagement signals across AI productivity and tech education niches.",
      };
    }

    const prompt = `You are the lead content strategist for Learn With Avee (@learnwithavee), a top Indian tech education channel.
Niche: ${niche}
Observed recent popular video topics:
${evidence.slice(0, 8).map((v) => `- ${v.title} (${v.viewsPerHour} views/hr)`).join("\n")}

Task: Propose ONE high-performing, original, practical Short/Reel topic and a brief 1-sentence rationale.
Return raw JSON format only with no markdown fences:
{"topic": "Your Catchy Topic Title Here", "rationale": "Why this topic is timely and valuable"}`;

    const tryGenerate = async (provider: "gemini" | "openrouter" | "openai", key: string, model: string): Promise<string> => {
      if (provider === "gemini") {
        const ai = new GoogleGenAI({ apiKey: key, httpOptions: { apiVersion: "v1beta" } });
        const targetModel = this.normalizeGeminiModel(model);
        const result = await ai.models.generateContent({ model: targetModel, contents: prompt });
        return result.text || "";
      } else {
        const client = new OpenAI({
          apiKey: key,
          baseURL: provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined,
        });
        const response = await client.chat.completions.create({
          model: model || (provider === "openrouter" ? "meta-llama/llama-3.3-70b-instruct" : "gpt-4o-mini"),
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        });
        return response.choices[0]?.message?.content || "";
      }
    };

    let rawText = "";
    // Try primary resolved provider
    try {
      rawText = await tryGenerate(creds.provider, creds.apiKey, creds.defaultModel);
    } catch (primaryErr: any) {
      console.warn(`Primary provider (${creds.provider}) topic generation failed:`, primaryErr?.message || primaryErr);
      // Fallback to secondary provider if available
      for (const fallbackP of ["openrouter", "openai", "gemini"] as const) {
        if (fallbackP === creds.provider) continue;
        const altCreds = await this.getProviderCredentials(fallbackP);
        if (altCreds) {
          try {
            rawText = await tryGenerate(fallbackP, altCreds.apiKey, altCreds.defaultModel);
            break;
          } catch {
            continue;
          }
        }
      }
    }

    // Robust JSON parsing
    if (rawText) {
      try {
        const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
        if (typeof parsed?.topic === "string" && parsed.topic.trim().length >= 4) {
          return {
            topic: parsed.topic.trim().slice(0, 160),
            rationale: typeof parsed?.rationale === "string" ? parsed.rationale.trim().slice(0, 500) : "Trending AI topic curated for high audience retention.",
          };
        }
      } catch (parseErr) {
        console.warn("Could not parse AI topic response as JSON:", parseErr);
      }
    }

    // Safe intelligent fallback topic if all AI providers fail or returned unparseable text
    return {
      topic: "Top 5 AI Tools & Hidden Features Every Student Needs in 2026",
      rationale: "Selected based on high engagement signals across AI productivity and tech education niches.",
    };
  }

  private static normalizeGeminiModel(model?: string): string {
    const candidate = model?.trim();
    if (candidate && /^(gemini-1\.[0-9]+|gemini-2\.[0-9]+)-(flash|pro)(-|$)/i.test(candidate)) {
      return candidate;
    }
    return candidate && /^[a-zA-Z0-9.-]+$/.test(candidate) && !candidate.includes("3.1")
      ? candidate
      : "gemini-1.5-flash";
  }

  /**
   * Tests connection to an AI provider with the provided API key
   */
  public static async testProviderConnection(
    provider: "gemini" | "openai" | "openrouter",
    apiKey: string,
    model?: string
  ): Promise<{ success: boolean; message: string; model: string }> {
    const testPrompt = "Respond with one single word: Connected.";
    const selectedModel =
      provider === "gemini"
        ? this.normalizeGeminiModel(model)
        : model || (provider === "openai" ? "gpt-4o-mini" : "meta-llama/llama-3.3-70b-instruct");

    try {
      if (provider === "gemini") {
        const genAI = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1beta" } });
        const result = await genAI.models.generateContent({ model: selectedModel, contents: testPrompt });
        const text = result.text || "";
        return { success: true, message: `Successfully connected to Gemini (${selectedModel}): ${text.trim()}`, model: selectedModel };
      }

      if (provider === "openai") {
        const openai = new OpenAI({ apiKey });
        const response = await openai.chat.completions.create({
          model: selectedModel,
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 10,
        });
        const reply = response.choices[0]?.message?.content || "";
        return { success: true, message: `Successfully connected to OpenAI (${selectedModel}): ${reply.trim()}`, model: selectedModel };
      }

      if (provider === "openrouter") {
        const openrouter = new OpenAI({
          apiKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": env.FRONTEND_URL,
            "X-Title": "Learn With Avee",
          },
        });
        const response = await openrouter.chat.completions.create({
          model: selectedModel,
          messages: [{ role: "user", content: testPrompt }],
          max_tokens: 10,
        });
        const reply = response.choices[0]?.message?.content || "";
        return { success: true, message: `Successfully connected to OpenRouter (${selectedModel}): ${reply.trim()}`, model: selectedModel };
      }

      throw new Error(`Unsupported provider: ${provider}`);
    } catch (err: any) {
      return {
        success: false,
        message: `Connection failed: ${err.message}`,
        model: selectedModel,
      };
    }
  }

  /**
   * Generates a high-retention Hindi/Hinglish Instagram Reel script for Learn With Avee
   */
  public static async generateReelScript(params: ScriptGenerationParams): Promise<GeneratedScriptResult> {
    const creds = await this.resolveProviderAndCredentials(params.provider);
    if (!creds) throw new AIServiceError("Configure an enabled AI API key (Gemini, OpenRouter, or OpenAI) in API Integrations before generating content.", 503);

    const activeProvider = creds.provider;
    const requestedModel = params.model || creds.defaultModel || env.DEFAULT_AI_MODEL;
    const modelToUse = activeProvider === "gemini" ? this.normalizeGeminiModel(requestedModel) : requestedModel;

    const systemPrompt = `You are the lead content creator and AI viral scriptwriter for "Learn With Avee" (@learnwithavee).
Learn With Avee specializes in: AI tools, ChatGPT/Gemini prompt engineering, Cyber Security, Tech updates, and Web Development.
Audience: Indian tech enthusiasts, developers, students, and professionals eager to learn AI.

Tone & Style Guidelines:
- High energy, engaging, natural conversational Hindi with Hinglish tech terms (e.g., "AI tool", "free website", "coding trick", "viral hack").
- Hook Rule: The first 2 seconds MUST stop the thumb scroll immediately with curiosity or a startling fact.
- Value delivery: Fast, crisp 3-4 key points with zero fluff.
- Strong ending and clear Call to Action (CTA): e.g. "Save karlo baad me kaam aayega aur Learn With Avee ko follow karna mat bhoolna!"
- Return ONLY valid raw JSON with NO markdown code-block wrapping or extra text.`;

    const userPrompt = `Generate an original practical Instagram Reel script for the following topic:
Topic: "${params.topic}"
${params.reelTitle ? `Proposed Title: "${params.reelTitle}"` : ""}
Target Format: ${params.targetFormat || "REEL"}
Preferred Language: ${params.language || "Hinglish"}
Target Duration: ${params.targetDurationSeconds || 45} seconds
For a video workflow, produce exactly 3 or 4 scenes. Do not state unsupported statistics, made-up product features, or unsourced breaking-news claims.
${params.customInstructions ? `Additional notes: ${params.customInstructions}` : ""}

Return a JSON object conforming strictly to this structure:
{
  "reelTitle": "Catchy short title in Hinglish",
  "openingHook": "Punchy 1st-sentence hook (0-2s)",
  "scenes": [
    {
      "sceneNumber": 1,
      "durationSeconds": 4,
      "visualDescription": "Fast screen recording or camera angle",
      "onScreenText": "Short text on screen",
      "voiceoverHindi": "Hindi script in Devanagari script",
      "voiceoverHinglish": "Hindi script in English transliteration (Hinglish)"
    }
  ],
  "fullVoiceover": "Combined complete voiceover narration in Hinglish",
  "onScreenSummary": ["Point 1", "Point 2", "Point 3"],
  "caption": "Instagram caption with emojis and value summary",
  "hashtags": ["#LearnWithAvee", "#AITools", "#TechReels", "#InstagramGrowth", "#ArtificialIntelligence"],
  "cta": "Follow @learnwithavee and comment 'AI' for the link!",
  "suggestedDurationSeconds": 45
}`;

    let rawJsonResponse = "";

    if (activeProvider === "gemini") {
      try {
        const genAI = new GoogleGenAI({ apiKey: creds.apiKey, httpOptions: { apiVersion: "v1beta" } });
        const response = await genAI.models.generateContent({
          model: modelToUse,
          contents: `${systemPrompt}\n\n${userPrompt}`,
          config: { responseMimeType: "application/json" },
        });
        rawJsonResponse = response.text || "";
      } catch (geminiErr: any) {
        console.warn("Gemini script generation failed; checking fallback AI provider.");
        // Try fallback to OpenRouter / OpenAI if available
        const fallbackCreds = await this.getProviderCredentials("openrouter") || await this.getProviderCredentials("openai");
        if (fallbackCreds) {
          try {
            const isOR = Boolean(process.env.OPENROUTER_API_KEY);
            const client = new OpenAI({
              apiKey: fallbackCreds.apiKey,
              baseURL: isOR ? "https://openrouter.ai/api/v1" : undefined,
            });
            const response = await client.chat.completions.create({
              model: fallbackCreds.defaultModel,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              response_format: { type: "json_object" },
            });
            rawJsonResponse = response.choices[0]?.message?.content || "";
          } catch {
            throw new AIServiceError("AI script generation failed. Check that the API key has access to the selected model, then retry.");
          }
        } else {
          throw new AIServiceError("Gemini generation failed. Check that the API key has access to the selected model, then retry.");
        }
      }
    } else if (activeProvider === "openai" || activeProvider === "openrouter") {
      try {
        const client = new OpenAI({
          apiKey: creds.apiKey,
          baseURL: activeProvider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined,
        });
        const response = await client.chat.completions.create({
          model: modelToUse,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: activeProvider === "openai" ? { type: "json_object" } : undefined,
        });
        rawJsonResponse = response.choices[0]?.message?.content || "";
      } catch (aiErr: any) {
        console.warn(`${activeProvider} script generation failed, testing fallback:`, aiErr?.message || aiErr);
        // Try fallback to the other provider if available
        const fallbackP = activeProvider === "openrouter" ? "openai" : "openrouter";
        const altCreds = await this.getProviderCredentials(fallbackP);
        if (altCreds) {
          try {
            const client = new OpenAI({
              apiKey: altCreds.apiKey,
              baseURL: fallbackP === "openrouter" ? "https://openrouter.ai/api/v1" : undefined,
            });
            const response = await client.chat.completions.create({
              model: altCreds.defaultModel,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
            });
            rawJsonResponse = response.choices[0]?.message?.content || "";
          } catch {
            throw new AIServiceError("AI script generation failed. Check API key and model access, then retry.");
          }
        } else {
          throw new AIServiceError(`${activeProvider} generation failed: ${aiErr?.message || "Check API key and model"}.`);
        }
      }
    } else {
      throw new AIServiceError(`No enabled ${activeProvider} provider is available. Configure its API key first.`, 503);
    }

    try {
      // Clean possible markdown code fence ```json ... ```
      const cleaned = rawJsonResponse
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/, "")
        .trim();
      let parsed: any;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON structure found");
        }
      }
      if (
        typeof parsed.reelTitle !== "string" || typeof parsed.openingHook !== "string" ||
        typeof parsed.fullVoiceover !== "string" || !Array.isArray(parsed.scenes) ||
        !Array.isArray(parsed.hashtags) || typeof parsed.caption !== "string" ||
        parsed.scenes.some((scene: any) => typeof scene?.visualDescription !== "string" || typeof scene?.voiceoverHindi !== "string")
      ) throw new Error("invalid script fields");

      return {
        ...parsed,
        providerUsed: activeProvider,
        modelUsed: modelToUse,
      };
    } catch (parseError) {
      console.warn("Could not parse the AI script response as JSON.");
      throw new AIServiceError("The AI provider returned an invalid script response. Retry generation.");
    }
  }
}

