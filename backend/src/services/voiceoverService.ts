import https from "https";

export class VoiceoverService {
  /**
   * Generates a realistic spoken voiceover MP3 for Hindi/Hinglish text.
   * Free, zero-API-key, human-grade Google TTS audio.
   */
  static async generate(text: string, lang = "hi"): Promise<Buffer | null> {
    const clean = text.replace(/[\r\n\t]+/g, " ").replace(/[#*`_~]/g, "").trim();
    if (!clean) return null;

    try {
      const chunks = this.splitText(clean, 180);
      const audioBuffers: Buffer[] = [];

      for (const chunk of chunks) {
        const buf = await this.fetchTTSChunk(chunk, lang);
        if (buf && buf.length > 0) {
          audioBuffers.push(buf);
        }
      }

      if (audioBuffers.length === 0) return null;
      return Buffer.concat(audioBuffers);
    } catch (err: any) {
      console.warn("Voiceover TTS generation fallback:", err?.message || err);
      return null;
    }
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
          timeout: 10_000,
        },
        (res) => {
          if (res.statusCode !== 200) {
            return reject(new Error(`TTS responded with HTTP status ${res.statusCode}`));
          }
          const data: Buffer[] = [];
          res.on("data", (chunk) => data.push(chunk));
          res.on("end", () => resolve(Buffer.concat(data)));
        }
      );

      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("TTS request timed out"));
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
}
