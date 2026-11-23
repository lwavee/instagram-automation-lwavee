/**
 * Audio synthesis service for Learn With Avee.
 * Generates an original ambient tech lo-fi background bed in pure TypeScript (zero external assets).
 */
export class AudioService {
  static generateAmbientBed(durationSeconds: number): Buffer {
    const sampleRate = 44100;
    const totalSamples = Math.ceil(sampleRate * Math.max(2, durationSeconds));
    const wavBuffer = Buffer.alloc(44 + totalSamples * 2);

    // Write standard 44-byte WAV header (16-bit PCM Mono 44.1kHz)
    wavBuffer.write("RIFF", 0);
    wavBuffer.writeUInt32LE(36 + totalSamples * 2, 4);
    wavBuffer.write("WAVE", 8);
    wavBuffer.write("fmt ", 12);
    wavBuffer.writeUInt32LE(16, 16);
    wavBuffer.writeUInt16LE(1, 20); // PCM format
    wavBuffer.writeUInt16LE(1, 22); // Mono
    wavBuffer.writeUInt32LE(sampleRate, 24);
    wavBuffer.writeUInt32LE(sampleRate * 2, 28);
    wavBuffer.writeUInt16LE(2, 32);
    wavBuffer.writeUInt16LE(16, 34);
    wavBuffer.write("data", 36);
    wavBuffer.writeUInt32LE(totalSamples * 2, 40);

    // Warm, ambient chords (A3, C4, E4, D4) at 84 BPM
    const notes = [220.0, 261.63, 329.63, 293.66];
    const beatSeconds = 60 / 84;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const beat = t / beatSeconds;
      const noteIdx = Math.floor(beat) % notes.length;
      const freq = notes[noteIdx];
      const phase = beat % 1.0;

      // Soft envelope with gentle decay
      const envelope = Math.min(phase / 0.06, 1.0) * Math.exp(-phase * 2.8);
      let sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.08;
      // Warm sub-octave
      sample += Math.sin(2 * Math.PI * (freq / 2) * t) * envelope * 0.04;

      // Fade in and fade out
      const fadeIn = Math.min(t / 0.5, 1.0);
      const fadeOut = Math.min((durationSeconds - t) / 0.8, 1.0);
      const gain = Math.max(0, Math.min(1, fadeIn * fadeOut));
      sample *= gain;

      // Clamp to 16-bit signed integer
      const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
      wavBuffer.writeInt16LE(intSample, 44 + i * 2);
    }

    return wavBuffer;
  }
}
