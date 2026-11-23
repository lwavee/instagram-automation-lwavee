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

  /**
   * Generates procedural UI sound effects (pure 44.1kHz 16-bit PCM WAV, zero external assets).
   */
  static generateSoundEffect(type: "pop" | "whoosh" | "tap" | "chime" | "success"): Buffer {
    const sampleRate = 44100;
    let duration = 0.1;
    if (type === "whoosh") duration = 0.28;
    else if (type === "chime") duration = 0.35;
    else if (type === "success") duration = 0.45;
    else if (type === "pop") duration = 0.08;
    else if (type === "tap") duration = 0.05;

    const totalSamples = Math.ceil(sampleRate * duration);
    const buffer = Buffer.alloc(44 + totalSamples * 2);

    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + totalSamples * 2, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(1, 22); // Mono
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(totalSamples * 2, 40);

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (type === "pop") {
        // Frequency drops from 680Hz to 140Hz over 80ms
        const freq = 680 - (t / duration) * 540;
        const env = Math.exp(-t * 35);
        sample = Math.sin(2 * Math.PI * freq * t) * env * 0.45;
      } else if (type === "tap") {
        // Fast click impulse
        const freq = 1200;
        const env = Math.exp(-t * 80);
        sample = Math.sin(2 * Math.PI * freq * t) * env * 0.35;
      } else if (type === "whoosh") {
        // Bandpass filtered sweep
        const freq = 200 + Math.sin((t / duration) * Math.PI) * 800;
        const noise = (Math.random() * 2 - 1) * 0.25;
        const env = Math.sin((t / duration) * Math.PI);
        sample = (Math.sin(2 * Math.PI * freq * t) * 0.3 + noise) * env * 0.35;
      } else if (type === "chime") {
        // Two-tone bell (E5 659Hz + B5 987Hz)
        const env1 = Math.exp(-t * 9);
        const env2 = t > 0.08 ? Math.exp(-(t - 0.08) * 8) : 0;
        sample = Math.sin(2 * Math.PI * 659.25 * t) * env1 * 0.28 +
          Math.sin(2 * Math.PI * 987.77 * (t - 0.08)) * env2 * 0.32;
      } else if (type === "success") {
        // Ascending major chord (C5 523Hz, E5 659Hz, G5 784Hz)
        const env1 = Math.exp(-t * 7);
        const env2 = t > 0.07 ? Math.exp(-(t - 0.07) * 7) : 0;
        const env3 = t > 0.14 ? Math.exp(-(t - 0.14) * 6) : 0;
        sample = Math.sin(2 * Math.PI * 523.25 * t) * env1 * 0.22 +
          Math.sin(2 * Math.PI * 659.25 * Math.max(0, t - 0.07)) * env2 * 0.24 +
          Math.sin(2 * Math.PI * 783.99 * Math.max(0, t - 0.14)) * env3 * 0.28;
      }

      const intSample = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
      buffer.writeInt16LE(intSample, 44 + i * 2);
    }

    return buffer;
  }
}
