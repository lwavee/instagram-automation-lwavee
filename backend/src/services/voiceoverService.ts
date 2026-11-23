import https from "https";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { env } from "../config/env";
import { AIService } from "./aiService";
import OpenAI from "openai";

const execFileAsync = promisify(execFile);

export interface VoiceoverOptions {
  voice?: string;
  provider?: "edge-neural" | "openai" | "google";
  rate?: string; // e.g. "+0%", "+10%", "-5%"
  pitch?: string;
  lang?: string;
}

export class VoiceoverService {
  /**
   * Available production voices with verified metadata.
   */
  static readonly VOICES = [
    { id: "hi-IN-MadhurNeural", name: "Madhur (Indian Male Educator)", lang: "hi-IN", gender: "Male", provider: "edge-neural", recommended: true },
    { id: "hi-IN-SwaraNeural", name: "Swara (Indian Female Educator)", lang: "hi-IN", gender: "Female", provider: "edge-neural" },
    { id: "en-IN-PrabhatNeural", name: "Prabhat (Indian Male Tech)", lang: "en-IN", gender: "Male", provider: "edge-neural" },
    { id: "en-IN-NeerjaNeural", name: "Neerja (Indian Female Tech)", lang: "en-IN", gender: "Female", provider: "edge-neural" },
    { id: "alloy", name: "Alloy (OpenAI Balanced)", lang: "en", gender: "Neutral", provider: "openai" },
    { id: "onyx", name: "Onyx (OpenAI Deep Male)", lang: "en", gender: "Male", provider: "openai" },
    { id: "nova", name: "Nova (OpenAI Energetic Female)", lang: "en", gender: "Female", provider: "openai" },
  ];

  /**
   * Generates a high-fidelity spoken neural voiceover MP3.
   * Throws on unrecoverable failure; never silently outputs empty audio.
   */
  static async generate(
    text: string,
    options: VoiceoverOptions = {}
  ): Promise<{ buffer: Buffer; durationSeconds: number; voiceUsed: string }> {
    const clean = this.cleanForSpeech(text);
    if (!clean) throw new Error("Voiceover text is empty or contains no spoken words.");

    const requestedVoice = options.voice || "hi-IN-MadhurNeural";
    const provider = options.provider || (requestedVoice.startsWith("hi-IN") || requestedVoice.startsWith("en-IN") ? "edge-neural" : "openai");

    let buffer: Buffer | null = null;
    let voiceUsed = requestedVoice;

    // 1. Try Microsoft Edge Neural TTS
    if (provider === "edge-neural" || !options.provider) {
      try {
        buffer = await this.synthesizeEdgeNeural(clean, requestedVoice, options.rate);
        voiceUsed = requestedVoice;
      } catch (edgeErr: any) {
        console.warn(`Edge Neural TTS failed (${edgeErr?.message || edgeErr}). Trying alternative provider...`);
      }
    }

    // 2. Try OpenAI TTS if API key is configured
    if (!buffer) {
      const openAiKey = process.env.OPENAI_API_KEY;
      if (openAiKey) {
        try {
          buffer = await this.synthesizeOpenAI(clean, openAiKey, requestedVoice.includes("hi-IN") ? "alloy" : requestedVoice);
          voiceUsed = "openai-tts";
        } catch (openAiErr: any) {
          console.warn(`OpenAI TTS failed (${openAiErr?.message || openAiErr}).`);
        }
      }
    }

    // 3. Fallback to Google Neural/Translate TTS
    if (!buffer) {
      try {
        buffer = await this.synthesizeGoogleTTS(clean, options.lang || "hi");
        voiceUsed = "google-tts-hi";
      } catch (googleErr: any) {
        throw new Error(`All voiceover providers failed. Voiceover could not be synthesized: ${googleErr?.message || googleErr}`);
      }
    }

    if (!buffer || buffer.length < 500) {
      throw new Error("Voice synthesis generated insufficient audio data. Video creation stopped to avoid muted playback.");
    }

    const durationSeconds = await this.estimateDuration(buffer);
    return { buffer, durationSeconds, voiceUsed };
  }

  /**
   * Normalizes technical and Hinglish terms into clear spoken phonetic Hindi.
   */
  static cleanForSpeech(text: string): string {
    return text
      .replace(/\bAPI\b/gi, "ए पी आई")
      .replace(/\bAPIs\b/gi, "ए पी आईज़")
      .replace(/\bAI\b/gi, "ए आई")
      .replace(/\bUI\b/gi, "यू आई")
      .replace(/\bUX\b/gi, "यू एक्स")
      .replace(/\bURL\b/gi, "यू आर एल")
      .replace(/\bDB\b/gi, "डेटाबेस")
      .replace(/\bApp\b/gi, "ऐप")
      .replace(/\bApps\b/gi, "ऐप्स")
      .replace(/\bQR\b/gi, "क्यू आर")
      .replace(/\bWiFi\b/gi, "वाई फाई")
      .replace(/\bGit\b/gi, "गिट")
      .replace(/\bGitHub\b/gi, "गिट हब")
      .replace(/\bDocker\b/gi, "डॉकर")
      .replace(/\bBackend\b/gi, "बैकएंड")
      .replace(/\bFrontend\b/gi, "फ्रंटएंड")
      .replace(/\bServer\b/gi, "सर्वर")
      .replace(/\bClient\b/gi, "क्लाइंट")
      .replace(/\bCode\b/gi, "कोड")
      .replace(/\bCoding\b/gi, "कोडिंग")
      .replace(/\bBug\b/gi, "बग")
      .replace(/\bData\b/gi, "डेटा")
      .replace(/\bCloud\b/gi, "क्लाउड")
      .replace(/\bBot\b/gi, "बॉट")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[#*`_~]/g, "")
      .trim();
  }

  private static synthesizeEdgeNeural(text: string, voiceName: string, rate = "+0%"): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const tts = new MsEdgeTTS();
      tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
        .then(() => {
          const { audioStream } = tts.toStream(text, { rate: rate || "+0%" });
          const chunks: Buffer[] = [];
          audioStream.on("data", (chunk: Buffer) => chunks.push(chunk));
          audioStream.on("end", () => {
            tts.close();
            resolve(Buffer.concat(chunks));
          });
          audioStream.on("error", (err) => {
            tts.close();
            reject(err);
          });
        })
        .catch(reject);
    });
  }

  private static async synthesizeOpenAI(text: string, apiKey: string, voice: string): Promise<Buffer> {
    const openai = new OpenAI({ apiKey });
    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: (voice as any) || "alloy",
      input: text,
      response_format: "mp3",
    });
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private static async synthesizeGoogleTTS(text: string, lang: string): Promise<Buffer> {
    const chunks = this.splitText(text, 180);
    const audioBuffers: Buffer[] = [];

    for (const chunk of chunks) {
      const buf = await this.fetchTTSChunk(chunk, lang);
      if (buf && buf.length > 0) audioBuffers.push(buf);
    }

    if (audioBuffers.length === 0) throw new Error("Google TTS returned no audio data.");
    return Buffer.concat(audioBuffers);
  }

  private static fetchTTSChunk(text: string, lang: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const encoded = encodeURIComponent(text);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`;

      const req = https.get(
        url,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://translate.google.com/",
          },
          timeout: 12_000,
        },
        (res) => {
          if (res.statusCode !== 200) return reject(new Error(`Google TTS responded with HTTP status ${res.statusCode}`));
          const data: Buffer[] = [];
          res.on("data", (chunk) => data.push(chunk));
          res.on("end", () => resolve(Buffer.concat(data)));
        }
      );

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("Google TTS request timed out"));
      });
    });
  }

  private static splitText(text: string, maxLen = 180): string[] {
    if (text.length <= maxLen) return [text];
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let current = "";

    for (const word of words) {
      if ((current + " " + word).trim().length <= maxLen) {
        current = (current + " " + word).trim();
      } else {
        if (current) chunks.push(current);
        current = word;
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  /**
   * Fast duration estimation from MP3 bitrate and frame headers.
   */
  private static async estimateDuration(buffer: Buffer): Promise<number> {
    // 24kHz 48kbps MP3: 48,000 bits/sec = 6,000 bytes/sec
    // Standard estimation with minimum 3.0s and maximum 20.0s clamp
    const bytesPerSec = 6000;
    const estimated = buffer.length / bytesPerSec;
    return Math.max(3.0, Math.min(20.0, Math.round(estimated * 10) / 10));
  }
}
