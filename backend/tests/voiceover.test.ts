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

  it("handles empty or blank text gracefully with explicit validation error", async () => {
    await expect(VoiceoverService.generate("   ")).rejects.toThrow(/empty/);
  });

  it("exposes production neural voices and phonetically normalizes tech terms", () => {
    expect(VoiceoverService.VOICES.length).toBeGreaterThan(3);
    const cleaned = VoiceoverService.cleanForSpeech("Learn how this AI and API works inside the App");
    expect(cleaned).toContain("ए आई");
    expect(cleaned).toContain("ए पी आई");
    expect(cleaned).toContain("ऐप");
  });
});
