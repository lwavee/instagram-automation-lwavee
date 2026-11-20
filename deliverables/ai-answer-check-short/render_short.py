"""Render the caption-led 9:16 draft for YouTube Shorts and Instagram Reels.

Requires Pillow, numpy, and imageio-ffmpeg in the local Python environment.
The generated visual panels are kept separately so the edit can be revised.
"""
from __future__ import annotations

import math
import subprocess
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT, FPS = 540, 960, 24
DURATION = 27
MAGENTA = (245, 44, 151)
AMBER = (255, 184, 61)
WHITE = (255, 250, 246)
MUTED = (228, 218, 229)


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


FONT_BOLD_PATH = r"C:\Windows\Fonts\arialbd.ttf"
FONT_REGULAR_PATH = r"C:\Windows\Fonts\arial.ttf"
FONT_BRAND = font(FONT_BOLD_PATH, 15)
FONT_LABEL = font(FONT_BOLD_PATH, 17)
FONT_COPY = font(FONT_BOLD_PATH, 29)
FONT_END = font(FONT_BOLD_PATH, 31)
FONT_SMALL = font(FONT_REGULAR_PATH, 17)


def cover(path: Path) -> Image.Image:
    image = Image.open(path).convert("RGB")
    scale = max(WIDTH / image.width, HEIGHT / image.height)
    image = image.resize((round(image.width * scale), round(image.height * scale)), Image.Resampling.LANCZOS)
    left = max(0, (image.width - WIDTH) // 2)
    top = max(0, (image.height - HEIGHT) // 2)
    return image.crop((left, top, left + WIDTH, top + HEIGHT))


def make_music(path: Path) -> None:
    """Create a quiet, original ambient bed (no third-party track)."""
    rate = 44_100
    total = rate * DURATION
    t = np.arange(total, dtype=np.float64) / rate
    notes = (220.00, 261.63, 329.63, 293.66)
    beat = 60 / 84
    beat_pos = t / beat
    note_idx = np.floor(beat_pos).astype(np.int64) % len(notes)
    phase = (beat_pos % 1.0)
    freq = np.take(np.asarray(notes), note_idx)
    envelope = np.minimum(phase / 0.06, 1.0) * np.exp(-phase * 3.5)
    pad = 0.035 * np.sin(2 * np.pi * freq * t) * envelope
    pad += 0.018 * np.sin(2 * np.pi * (freq / 2) * t)
    for second in (4, 10, 16, 22):
        delta = t - second
        bell = np.where(delta >= 0, 0.045 * np.sin(2 * np.pi * 880 * np.maximum(delta, 0)) * np.exp(-np.maximum(delta, 0) * 9), 0)
        pad += bell
    fade = np.minimum(np.minimum(t / 0.4, (DURATION - t) / 1.0), 1.0).clip(0, 1)
    mono = np.clip(pad * fade, -0.16, 0.16)
    stereo = np.column_stack((mono, mono))
    pcm = (stereo * 32767).astype("<i2")
    with wave.open(str(path), "wb") as stream:
        stream.setnchannels(2)
        stream.setsampwidth(2)
        stream.setframerate(rate)
        stream.writeframes(pcm.tobytes())


def draw_wrapped(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.FreeTypeFont,
                 max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=face)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def background_for(t: float, scenes: list[Image.Image]) -> Image.Image:
    if t < 4:
        return scenes[0].copy()
    if t < 10:
        return scenes[1].copy()
    if t < 22:
        return scenes[2].copy()
    # A simple branded end card, composed from shapes rather than a fourth generated image.
    image = Image.new("RGB", (WIDTH, HEIGHT), (19, 13, 26))
    draw = ImageDraw.Draw(image)
    for y in range(HEIGHT):
        p = y / HEIGHT
        tint = (int(19 + 17 * p), int(13 + 4 * p), int(26 + 10 * p))
        draw.line((0, y, WIDTH, y), fill=tint)
    draw.rounded_rectangle((34, 280, WIDTH - 34, 670), radius=36, fill=(30, 20, 39), outline=MAGENTA, width=3)
    draw.ellipse((WIDTH // 2 - 90, 330, WIDTH // 2 + 90, 510), outline=AMBER, width=8)
    draw.ellipse((WIDTH // 2 - 61, 359, WIDTH // 2 + 61, 481), outline=MAGENTA, width=7)
    draw.line((WIDTH // 2 - 38, 421, WIDTH // 2 - 7, 451), fill=AMBER, width=13)
    draw.line((WIDTH // 2 - 7, 451, WIDTH // 2 + 47, 389), fill=AMBER, width=13)
    draw.text((WIDTH // 2, 545), "3 CHECKS. SMARTER AI.", font=FONT_LABEL, fill=WHITE, anchor="mm")
    draw.text((WIDTH // 2, 588), "LEARN WITH AVEE", font=FONT_BRAND, fill=AMBER, anchor="mm")
    return image


def render_frame(t: float, scenes: list[Image.Image]) -> Image.Image:
    image = background_for(t, scenes)
    # Mild camera drift keeps the illustrated hold from feeling like a static slideshow.
    if t < 22:
        phase = (t % 6) / 6
        zoom = 1.0 + 0.018 * phase
        w, h = round(WIDTH * zoom), round(HEIGHT * zoom)
        image = image.resize((w, h), Image.Resampling.LANCZOS)
        image = image.crop(((w - WIDTH) // 2, (h - HEIGHT) // 2, (w + WIDTH) // 2, (h + HEIGHT) // 2))

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rounded_rectangle((28, 36, 207, 74), radius=19, fill=(27, 15, 35, 216), outline=(245, 44, 151, 180), width=1)
    draw.text((42, 46), "LEARN WITH AVEE", font=FONT_BRAND, fill=WHITE)

    if t < 4:
        label, copy = "AI SMART CHECK", "AI ne confident answer diya?\nEk second—pehle teen checks."
    elif t < 10:
        label, copy = "CHECK 1", "Original source kholo.\nQuote aur date page par match karo."
    elif t < 16:
        label, copy = "CHECK 2", "Ek independent, reliable\nsource se cross-check karo."
    elif t < 22:
        label, copy = "CHECK 3", "Calculation ya code hai?\nSafe tareeke se khud test karo."
    else:
        label, copy = "SAVE THIS RULE", "Proof na mile, answer ko fact mat bolo."

    if t < 22:
        draw.rounded_rectangle((29, 665, WIDTH - 29, 901), radius=26, fill=(17, 12, 24, 225), outline=(255, 184, 61, 155), width=2)
        pill_w = draw.textbbox((0, 0), label, font=FONT_LABEL)[2] + 28
        draw.rounded_rectangle((49, 685, 49 + pill_w, 721), radius=17, fill=(245, 44, 151, 240))
        draw.text((63, 693), label, font=FONT_LABEL, fill=WHITE)
        wrapped: list[str] = []
        for paragraph in copy.split("\n"):
            wrapped.extend(draw_wrapped(draw, paragraph, FONT_COPY, 438))
        for i, line in enumerate(wrapped):
            draw.text((49, 745 + i * 42), line, font=FONT_COPY, fill=WHITE, stroke_width=0)
        idx = 1 if t < 10 else 2 if t < 16 else 3
        draw.rounded_rectangle((49, 885, 49 + idx * 84, 892), radius=3, fill=AMBER)
        draw.rounded_rectangle((49 + idx * 84, 885, 301, 892), radius=3, fill=(112, 94, 120, 180))
    else:
        draw.rounded_rectangle((28, 705, WIDTH - 28, 902), radius=26, fill=(17, 12, 24, 225), outline=(255, 184, 61, 155), width=2)
        end_lines: list[str] = []
        for paragraph in copy.split("\n"):
            end_lines.extend(draw_wrapped(draw, paragraph, FONT_END, 460))
        for i, line in enumerate(end_lines):
            draw.text((WIDTH // 2, 748 + i * 45), line, font=FONT_END, fill=WHITE, anchor="mm")
        draw.text((WIDTH // 2, 845), "SAVE • SHARE • LEARN", font=FONT_SMALL, fill=AMBER, anchor="mm")

    # Soft vignette on the top and bottom only, preserving the focal illustration.
    return Image.alpha_composite(image.convert("RGBA"), overlay).convert("RGB")


def main() -> None:
    scene_paths = [ROOT / "scene-01-hook.png", ROOT / "scene-02-source.png", ROOT / "scene-03-verification.png"]
    missing = [str(p.name) for p in scene_paths if not p.exists()]
    if missing:
        raise SystemExit("Missing generated scene file(s): " + ", ".join(missing))
    scenes = [cover(path) for path in scene_paths]
    temp_audio = ROOT / "ambient-original.wav"
    out = ROOT / "youtube-short.mp4"
    make_music(temp_audio)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        ffmpeg, "-y", "-f", "rawvideo", "-pixel_format", "rgb24", "-video_size", f"{WIDTH}x{HEIGHT}",
        "-framerate", str(FPS), "-i", "pipe:0", "-i", str(temp_audio), "-map", "0:v:0", "-map", "1:a:0",
        "-vf", "scale=720:1280:flags=lanczos", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "96k", "-t", str(DURATION), "-movflags", "+faststart", str(out),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    assert process.stdin is not None
    try:
        total_frames = DURATION * FPS
        for frame_no in range(total_frames):
            t = frame_no / FPS
            process.stdin.write(render_frame(t, scenes).tobytes())
        process.stdin.close()
    except Exception:
        process.kill()
        raise
    stderr = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
    code = process.wait()
    if code != 0:
        raise SystemExit("ffmpeg failed:\n" + stderr[-5000:])
    # The Instagram export is a distinct, ready-to-download copy in the package.
    reel = ROOT / "instagram-reel.mp4"
    reel.write_bytes(out.read_bytes())
    print(f"Rendered {out.name} and {reel.name}: {out.stat().st_size} bytes each, {DURATION}s, {WIDTH}x{HEIGHT}@{FPS}fps")


if __name__ == "__main__":
    main()
