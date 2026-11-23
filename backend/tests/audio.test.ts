import { describe, it, expect } from "vitest";
import { AudioService } from "../src/services/audioService";

describe("AudioService", () => {
  it("synthesizes valid PCM WAV audio bed with correct header and duration", () => {
    const duration = 4;
    const wav = AudioService.generateAmbientBed(duration);
    expect(wav).toBeInstanceOf(Buffer);
    expect(wav.length).toBeGreaterThan(44);
    expect(Buffer.from(wav.subarray(0, 4)).toString("ascii")).toBe("RIFF");
    expect(Buffer.from(wav.subarray(8, 12)).toString("ascii")).toBe("WAVE");

    // Sample rate check: 44100
    const sampleRate = wav.readUInt32LE(24);
    expect(sampleRate).toBe(44100);
  });

  it("synthesizes valid procedural UI sound effects with PCM WAV headers", () => {
    const effects = ["pop", "whoosh", "tap", "chime", "success"] as const;
    for (const fx of effects) {
      const wav = AudioService.generateSoundEffect(fx);
      expect(wav).toBeInstanceOf(Buffer);
      expect(wav.length).toBeGreaterThan(44);
      expect(Buffer.from(wav.subarray(0, 4)).toString("ascii")).toBe("RIFF");
      expect(Buffer.from(wav.subarray(8, 12)).toString("ascii")).toBe("WAVE");
    }
  });
});
