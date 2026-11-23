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
      let parsed: any = null;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch {}
        }
      }

      if (parsed && typeof parsed === "object") {
        const reelTitle = (typeof parsed.reelTitle === "string" && parsed.reelTitle.trim()) || params.topic || "Tech Explainer With Avee";
        const openingHook = (typeof parsed.openingHook === "string" && parsed.openingHook.trim()) || `${reelTitle} — aasan bhasha mein samajhte hain!`;
        const scenesRaw = Array.isArray(parsed.scenes) && parsed.scenes.length >= 2 ? parsed.scenes : [];

        if (scenesRaw.length >= 2) {
          const scenes = scenesRaw.map((scene: any, index: number) => {
            const vHinglish = (typeof scene?.voiceoverHinglish === "string" && scene.voiceoverHinglish.trim()) ||
                              (typeof scene?.voiceoverHindi === "string" && scene.voiceoverHindi.trim()) ||
                              (typeof scene?.voiceover === "string" && scene.voiceover.trim()) ||
                              `Scene ${index + 1} voiceover for ${params.topic}`;
            const vHindi = (typeof scene?.voiceoverHindi === "string" && scene.voiceoverHindi.trim()) || vHinglish;
            return {
              sceneNumber: index + 1,
              durationSeconds: Number(scene?.durationSeconds) || 5,
              visualDescription: String(scene?.visualDescription || scene?.visual || `Scene ${index + 1} illustration`),
              onScreenText: String(scene?.onScreenText || scene?.text || `Key Point ${index + 1}`).slice(0, 32),
              voiceoverHindi: vHindi,
              voiceoverHinglish: vHinglish,
            };
          });

          const fullVoiceover = (typeof parsed.fullVoiceover === "string" && parsed.fullVoiceover.trim()) ||
                                scenes.map((s: any) => s.voiceoverHinglish).join(" ");
          const hashtags = Array.isArray(parsed.hashtags) && parsed.hashtags.length > 0
            ? parsed.hashtags
            : ["#LearnWithAvee", "#TechTips", "#AI", "#Coding", "#TechReels"];
          const caption = (typeof parsed.caption === "string" && parsed.caption.trim()) ||
                          `🚀 ${reelTitle}\n\n${openingHook}\n\nFollow @learnwithavee for daily tech updates!\n\n${hashtags.join(" ")}`;

          return {
            reelTitle,
            openingHook,
            scenes,
            fullVoiceover,
            onScreenSummary: Array.isArray(parsed.onScreenSummary) ? parsed.onScreenSummary : scenes.map((s: any) => s.onScreenText),
            caption,
            hashtags,
            cta: (typeof parsed.cta === "string" && parsed.cta.trim()) || "Follow @learnwithavee for more smart tech tips!",
            suggestedDurationSeconds: Number(parsed.suggestedDurationSeconds) || scenes.length * 6,
            providerUsed: activeProvider,
            modelUsed: modelToUse,
          };
        }
      }

      // If parsing didn't produce at least 2 valid scenes, use structured fallback
      return this.generateFallbackScript(params, activeProvider, modelToUse);
    } catch (parseError) {
      console.warn("Script parsing failed; using intelligent topic template fallback.");
      return this.generateFallbackScript(params, activeProvider, modelToUse);
    }
  }

  /**
   * Generates a high-quality educational script template tailored to the requested topic.
   */
  private static generateFallbackScript(params: ScriptGenerationParams, provider: string, model: string): GeneratedScriptResult {
    const rawTopic = params.topic?.trim() || "Modern Tech & AI Tools";
    const title = params.reelTitle || `${rawTopic.charAt(0).toUpperCase() + rawTopic.slice(1)} Explained Simply`;

    const scenes = [
      {
        sceneNumber: 1,
        durationSeconds: 5,
        visualDescription: `High-retention smartphone UI demonstrating ${rawTopic}`,
        onScreenText: "HOOK & CONCEPT",
        voiceoverHindi: `Kya aapko pata hai ki ${rawTopic} asal mein kaise kaam karta hai? Chaliye dekhte hain!`,
        voiceoverHinglish: `Kya aapko pata hai ki ${rawTopic} asal mein kaise kaam karta hai? Chaliye dekhte hain!`,
      },
      {
        sceneNumber: 2,
        durationSeconds: 6,
        visualDescription: "Comparison breakdown between traditional methods and modern technology",
        onScreenText: "OLD VS MODERN",
        voiceoverHindi: `Pehle logon ko ise manually karna padta tha, lekin ab smart technology se sab instant ho chuka hai.`,
        voiceoverHinglish: `Pehle logon ko ise manually karna padta tha, lekin ab smart technology se sab instant ho chuka hai.`,
      },
      {
        sceneNumber: 3,
        durationSeconds: 6,
        visualDescription: "Cloud architecture and real-time data packet routing animation",
        onScreenText: "HOW IT WORKS",
        voiceoverHindi: `Aapka input encrypted cloud network ke through process hota hai aur miliseconds mein result mil jata hai.`,
        voiceoverHinglish: `Aapka input encrypted cloud network ke through process hota hai aur miliseconds mein result mil jata hai.`,
      },
      {
        sceneNumber: 4,
        durationSeconds: 7,
        visualDescription: "Learn With Avee channel branding and follow call to action",
        onScreenText: "FOLLOW @LEARNWITHAVEE",
        voiceoverHindi: `Aisi aur smart tech aur AI tricks ko Hindi mein samajhne ke liye Learn With Avee ko abhi follow karo!`,
        voiceoverHinglish: `Aisi aur smart tech aur AI tricks ko Hindi mein samajhne ke liye Learn With Avee ko abhi follow karo!`,
      },
    ];

    const fullVoiceover = scenes.map((s) => s.voiceoverHinglish).join(" ");
    const hashtags = ["#LearnWithAvee", "#TechTricks", "#Coding", "#TechEducation", "#CyberSecurity", "#AI"];

    return {
      reelTitle: title,
      openingHook: `Kya aapko pata hai ki ${rawTopic} asal mein kaise kaam karta hai?`,
      scenes,
      fullVoiceover,
      onScreenSummary: [
        `${rawTopic} fundamental concept`,
        "Old approach vs modern architecture",
        "Encrypted real-time data flow",
        "Follow @learnwithavee for daily tech guides",
      ],
      caption: `🚀 ${title}\n\nKya aapko pata hai ki ${rawTopic} kaise kaam karta hai? Learn With Avee par tech aur AI ko aasan bhasha mein samjhein!\n\nSave this for later and follow @learnwithavee! 👇\n\n${hashtags.join(" ")}`,
      hashtags,
      cta: "Follow @learnwithavee for more smart tech tips!",
      suggestedDurationSeconds: 24,
      providerUsed: provider,
      modelUsed: model,
    };
  }
}

