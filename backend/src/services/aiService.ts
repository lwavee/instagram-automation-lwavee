import { GoogleGenerativeAI } from "@google/generative-ai";
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
      return { apiKey: process.env.GEMINI_API_KEY, defaultModel: "gemini-1.5-flash" };
    }
    if (provider === "openai" && process.env.OPENAI_API_KEY) {
      return { apiKey: process.env.OPENAI_API_KEY, defaultModel: "gpt-4o-mini" };
    }
    if (provider === "openrouter" && process.env.OPENROUTER_API_KEY) {
      return { apiKey: process.env.OPENROUTER_API_KEY, defaultModel: "meta-llama/llama-3.3-70b-instruct" };
    }

    return null;
  }

  private static normalizeGeminiModel(model?: string): string {
    if (!model) return "gemini-1.5-flash";
    const m = model.trim().toLowerCase();
    if (m === "gemini-1.5-flash" || m === "gemini-1.5-pro" || m === "gemini-2.0-flash") {
      return m;
    }
    if (m.includes("2.0")) return "gemini-2.0-flash";
    if (m.includes("pro")) return "gemini-1.5-pro";
    return "gemini-1.5-flash";
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
        const genAI = new GoogleGenerativeAI(apiKey);
        const geminiModel = genAI.getGenerativeModel({ model: selectedModel });
        const result = await geminiModel.generateContent(testPrompt);
        const text = result.response.text();
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
    const preferredProvider = params.provider || env.DEFAULT_AI_PROVIDER;
    let creds = await this.getProviderCredentials(preferredProvider);

    // If preferred provider not configured, try fallbacks
    let activeProvider = preferredProvider;
    if (!creds) {
      for (const fallback of ["gemini", "openai", "openrouter"] as const) {
        if (fallback !== preferredProvider) {
          creds = await this.getProviderCredentials(fallback);
          if (creds) {
            activeProvider = fallback;
            break;
          }
        }
      }
    }

    const modelToUse = params.model || (creds ? creds.defaultModel : env.DEFAULT_AI_MODEL);

    const systemPrompt = `You are the lead content creator and AI viral scriptwriter for "Learn With Avee" (@learnwithavee).
Learn With Avee specializes in: AI tools, ChatGPT/Gemini prompt engineering, Cyber Security, Tech updates, and Web Development.
Audience: Indian tech enthusiasts, developers, students, and professionals eager to learn AI.

Tone & Style Guidelines:
- High energy, engaging, natural conversational Hindi with Hinglish tech terms (e.g., "AI tool", "free website", "coding trick", "viral hack").
- Hook Rule: The first 2 seconds MUST stop the thumb scroll immediately with curiosity or a startling fact.
- Value delivery: Fast, crisp 3-4 key points with zero fluff.
- Strong ending and clear Call to Action (CTA): e.g. "Save karlo baad me kaam aayega aur Learn With Avee ko follow karna mat bhoolna!"
- Return ONLY valid raw JSON with NO markdown code-block wrapping or extra text.`;

    const userPrompt = `Generate a high-converting Instagram Reel script for the following topic:
Topic: "${params.topic}"
${params.reelTitle ? `Proposed Title: "${params.reelTitle}"` : ""}
Target Format: ${params.targetFormat || "REEL"}
Preferred Language: ${params.language || "Hinglish"}
Target Duration: ${params.targetDurationSeconds || 45} seconds
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

    if (creds && activeProvider === "gemini") {
      try {
        const genAI = new GoogleGenerativeAI(creds.apiKey);
        const actualModel = this.normalizeGeminiModel(modelToUse);
        const model = genAI.getGenerativeModel({
          model: actualModel,
          generationConfig: { responseMimeType: "application/json" },
        });
        const response = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
        rawJsonResponse = response.response.text();
      } catch (geminiErr: any) {
        console.warn(`Gemini generation failed: ${geminiErr.message}. Checking fallbacks...`);
        // Fallback to OpenRouter if configured
        if (process.env.OPENROUTER_API_KEY) {
          try {
            console.log("Switching to OpenRouter fallback (meta-llama/llama-3.3-70b-instruct)...");
            const orClient = new OpenAI({
              apiKey: process.env.OPENROUTER_API_KEY,
              baseURL: "https://openrouter.ai/api/v1",
            });
            const response = await orClient.chat.completions.create({
              model: "meta-llama/llama-3.3-70b-instruct",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              response_format: { type: "json_object" },
            });
            rawJsonResponse = response.choices[0]?.message?.content || "";
            activeProvider = "openrouter";
          } catch (orErr) {
            console.warn("OpenRouter fallback also failed, using smart template.");
            return this.generateTemplateScript(params);
          }
        } else {
          return this.generateTemplateScript(params);
        }
      }
    } else if (creds && (activeProvider === "openai" || activeProvider === "openrouter")) {
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
          response_format: { type: "json_object" },
        });
        rawJsonResponse = response.choices[0]?.message?.content || "";
      } catch (aiErr: any) {
        console.warn(`${activeProvider} generation failed: ${aiErr.message}. Using smart template.`);
        return this.generateTemplateScript(params);
      }
    } else {
      // Fallback deterministic smart template generator if API keys are not yet entered by user
      return this.generateTemplateScript(params);
    }

    try {
      // Clean possible markdown code fence ```json ... ```
      const cleaned = rawJsonResponse
        .replace(/^```json/i, "")
        .replace(/^```/i, "")
        .replace(/```$/, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      return {
        ...parsed,
        providerUsed: activeProvider,
        modelUsed: modelToUse,
      };
    } catch (parseError) {
      console.warn("Could not parse LLM JSON response, fallback to template:", parseError);
      return this.generateTemplateScript(params);
    }
  }

  /**
   * Deterministic smart template fallback for when AI keys are not yet configured
   */
  private static generateTemplateScript(params: ScriptGenerationParams): GeneratedScriptResult {
    const topic = params.topic || "Top 3 AI Tools for 2026";
    return {
      reelTitle: `${topic} — Secret AI Hack!`,
      openingHook: `Kya aapko pata hai 90% log abhi bhi AI ko galat tarike se use kar rahe hain?`,
      scenes: [
        {
          sceneNumber: 1,
          durationSeconds: 4,
          visualDescription: "Phone screen zooming in with shock expression",
          onScreenText: "STOP USING AI LIKE THIS!",
          voiceoverHindi: "क्या आपको पता है 90% लोग अभी भी AI को गलत तरीके से यूज़ कर रहे हैं?",
          voiceoverHinglish: "Kya aapko pata hai 90% log abhi bhi AI ko galat tarike se use kar rahe hain?",
        },
        {
          sceneNumber: 2,
          durationSeconds: 12,
          visualDescription: "Screen capture demonstrating the exact feature or prompt in action",
          onScreenText: "Step 1: Use specific context & persona",
          voiceoverHindi: "आज मैं आपको Learn With Avee का वो सीक्रेट प्रॉम्प्ट बताने वाला हूँ जो आपका काम 10x फ़ास्ट कर देगा।",
          voiceoverHinglish: "Aaj main aapko Learn With Avee ka wo secret prompt batane wala hoon jo aapka kaam 10x fast kar dega.",
        },
        {
          sceneNumber: 3,
          durationSeconds: 15,
          visualDescription: "Browser tab switching showing live result and speed comparison",
          onScreenText: "Step 2: Automate with smart workflows",
          voiceoverHindi: "बस इस वेबसाइट पर जाकर ये फ़्री टेम्पलेट अप्लाई करो और देखो मैजिक।",
          voiceoverHinglish: "Bas is website par jaakar ye free template apply karo aur dekho magic.",
        },
        {
          sceneNumber: 4,
          durationSeconds: 9,
          visualDescription: "Callout sticker to follow and comment",
          onScreenText: "Save this Reel & Follow @learnwithavee",
          voiceoverHindi: "इस रील को अभी सेव कर लो और ऐसे ही AI सीक्रेट्स के लिए Learn With Avee को फ़ॉलो करना मत भूलना!",
          voiceoverHinglish: "Is Reel ko abhi save kar lo aur aise hi AI secrets ke liye Learn With Avee ko follow karna mat bhoolna!",
        },
      ],
      fullVoiceover: `Kya aapko pata hai 90% log abhi bhi AI ko galat tarike se use kar rahe hain? Aaj main aapko Learn With Avee ka wo secret prompt batane wala hoon jo aapka kaam 10x fast kar dega. Bas is website par jaakar ye free template apply karo aur dekho magic. Is Reel ko abhi save kar lo aur aise hi AI secrets ke liye Learn With Avee ko follow karna mat bhoolna!`,
      onScreenSummary: [
        "Stop prompt stuffing",
        "Use structured system roles",
        "Automate repetitive daily tasks",
        "Save time & 10x productivity",
      ],
      caption: `🔥 ${topic} — Don't miss this! \n\nSave this Reel for later and share it with your tech squad! 🚀\n\nFollow @learnwithavee for daily practical AI, Coding & Automation insights!`,
      hashtags: [
        "#LearnWithAvee",
        "#AITools",
        "#HinglishTech",
        "#ArtificialIntelligence",
        "#InstagramReels",
        "#TechUpdates",
        "#ProductivityHack",
      ],
      cta: "Follow @learnwithavee & save this Reel!",
      suggestedDurationSeconds: 40,
      providerUsed: "template-generator",
      modelUsed: "built-in-high-retention-v1",
    };
  }
}

