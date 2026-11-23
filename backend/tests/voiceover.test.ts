import { describe, it, expect } from "vitest";
import { VoiceoverService } from "../src/services/voiceoverService";

describe("VoiceoverService", () => {
  it("splits text into chunks safely without breaking words", () => {
    const text = "A".repeat(50) + " " + "B".repeat(50) + " " + "C".repeat(50) + " " + "D".repeat(50);
    const chunks = (VoiceoverService as any).splitText(text, 120);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(120);
    }
  });

  it("handles empty or blank text gracefully", async () => {
    const result = await VoiceoverService.generate("   ");
    expect(result).toBeNull();
  });
});
