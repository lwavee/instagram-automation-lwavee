import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { Resvg } from "@resvg/resvg-js";
import { AudioService } from "./audioService";

export interface MotionSceneSpec {
  sceneNumber: number;
  totalScenes: number;
  durationSeconds: number;
  theme: "phone-demo" | "comparison" | "data-flow" | "feature-cards" | "cta-outro";
  headline: string;
  subheadline?: string;
  badgeText: string;
  voiceoverText: string;
  onScreenText: string;
  analogyPair?: { left: string; right: string };
  menuItems?: Array<{ title: string; price: string; icon?: string }>;
  statusSteps?: string[];
  handle?: string;
}

// ---------------------------------------------------------------------------
// Animation math: Spring and Easing functions
// ---------------------------------------------------------------------------
export function spring(progress: number, damping = 7, frequency = 12): number {
  const p = Math.max(0, Math.min(1, progress));
  return 1 - Math.exp(-damping * p) * Math.cos(frequency * p);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

export function interpolate(val: number, inRange: [number, number], outRange: [number, number]): number {
  const [inMin, inMax] = inRange;
  const [outMin, outMax] = outRange;
  const t = Math.max(0, Math.min(1, (val - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}

export function escapeXml(unsafe: string): string {
  return String(unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ---------------------------------------------------------------------------
// Motion Graphics Component Builders (Clean Vector SVGs)
// ---------------------------------------------------------------------------
export class MotionComponents {
  static backgroundGrid(w: number, h: number, dark = false): string {
    const bg = dark ? "#0A0F1D" : "#F8FAFC";
    const dot = dark ? "#1E293B" : "#E2E8F0";
    return `
      <defs>
        <pattern id="bg-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="16" cy="16" r="1.5" fill="${dot}" />
        </pattern>
        <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.12"/>
        </filter>
        <filter id="glow-blue" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#3B82F6" flood-opacity="0.45"/>
        </filter>
      </defs>
      <rect width="${w}" height="${h}" fill="${bg}"/>
      <rect width="${w}" height="${h}" fill="url(#bg-grid)"/>
    `;
  }

  static topHeader(w: number, badge: string, headline: string, subhead = ""): string {
    const safeBadge = escapeXml(badge.toUpperCase());
    const safeHead = escapeXml(headline);
    const safeSub = escapeXml(subhead);
    return `
      <g transform="translate(48, 80)">
        <!-- Pill Badge -->
        <rect x="0" y="0" width="${Math.min(340, badge.length * 14 + 36)}" height="36" rx="18" fill="#EEF2FF" stroke="#C7D2FE" stroke-width="1.5"/>
        <text x="16" y="24" font-family="Arial, -apple-system, sans-serif" font-size="13" font-weight="bold" fill="#4338CA" letter-spacing="0.5">${safeBadge}</text>
        
        <!-- Main Headline -->
        <text x="0" y="74" font-family="Arial, -apple-system, sans-serif" font-size="28" font-weight="bold" fill="#0F172A">${safeHead}</text>
        ${subhead ? `<text x="0" y="106" font-family="Arial, -apple-system, sans-serif" font-size="16" font-weight="500" fill="#64748B">${safeSub}</text>` : ""}
      </g>
    `;
  }

  static animatedPhone(
    x: number,
    y: number,
    scale: number,
    screenContent: string,
    width = 360,
    height = 700
  ): string {
    return `
      <g transform="translate(${x}, ${y}) scale(${scale})" filter="url(#card-shadow)">
        <!-- Phone Outer Bezel -->
        <rect x="0" y="0" width="${width}" height="${height}" rx="52" fill="#0F172A" stroke="#334155" stroke-width="4.5"/>
        <!-- Screen Glass -->
        <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="42" fill="#FFFFFF"/>
        <!-- Dynamic Island / Speaker Pill -->
        <rect x="${width / 2 - 55}" y="20" width="110" height="28" rx="14" fill="#000000"/>
        <!-- Status Bar -->
        <text x="38" y="40" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0F172A">9:41</text>
        <circle cx="${width - 42}" cy="36" r="4" fill="#0F172A"/>
        
        <!-- Embedded Interactive Screen Content -->
        <g transform="translate(16, 68)">
          ${screenContent}
        </g>
        
        <!-- Home Navigation Indicator Bar -->
        <rect x="${width / 2 - 60}" y="${height - 22}" width="120" height="4.5" rx="2.5" fill="#94A3B8"/>
      </g>
    `;
  }

  static scanBeam(x1: number, y: number, x2: number, glow = true): string {
    return `
      <g ${glow ? 'filter="url(#glow-blue)"' : ""}>
        <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#2563EB" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="${x1 + 10}" y1="${y}" x2="${x2 - 10}" y2="${y}" stroke="#60A5FA" stroke-width="1.5" stroke-linecap="round"/>
      </g>
    `;
  }

  static dataPacket(fromX: number, fromY: number, toX: number, toY: number, progress: number): string {
    // Bezier curve packet animation
    const midX = (fromX + toX) / 2 + 50;
    const midY = (fromY + toY) / 2;
    const t = Math.max(0, Math.min(1, progress));
    const inv = 1 - t;
    const curX = inv * inv * fromX + 2 * inv * t * midX + t * t * toX;
    const curY = inv * inv * fromY + 2 * inv * t * midY + t * t * toY;

    return `
      <path d="M ${fromX} ${fromY} Q ${midX} ${midY} ${toX} ${toY}" fill="none" stroke="#CBD5E1" stroke-width="3" stroke-dasharray="6 6"/>
      <circle cx="${curX}" cy="${curY}" r="9" fill="#2563EB" filter="url(#glow-blue)"/>
      <circle cx="${curX}" cy="${curY}" r="4" fill="#FFFFFF"/>
    `;
  }

  static brandFooter(w: number, handle = "@learnwithavee"): string {
    return `
      <g transform="translate(${w / 2}, 1210)">
        <text x="0" y="0" font-family="Arial, -apple-system, sans-serif" font-size="15" font-weight="bold" fill="#64748B" text-anchor="middle" letter-spacing="0.5">${handle}</text>
      </g>
    `;
  }
}

// ---------------------------------------------------------------------------
// Scene Frame Renderers (Theme-specific visual storytelling)
// ---------------------------------------------------------------------------
export class MotionGraphicsEngine {
  /**
   * Renders a single frame of a motion graphics scene at normalized time t in [0, 1].
   */
  static renderFrame(spec: MotionSceneSpec, t: number, width = 720, height = 1280): string {
    switch (spec.theme) {
      case "phone-demo":
        return this.renderPhoneDemoScene(spec, t, width, height);
      case "comparison":
        return this.renderComparisonScene(spec, t, width, height);
      case "data-flow":
        return this.renderDataFlowScene(spec, t, width, height);
      case "feature-cards":
        return this.renderFeatureCardsScene(spec, t, width, height);
      case "cta-outro":
      default:
        return this.renderCTAOutroScene(spec, t, width, height);
    }
  }

  /**
   * Scene Theme 1: Phone Demonstration (e.g. Scanning QR code, opening app menu)
   */
  private static renderPhoneDemoScene(spec: MotionSceneSpec, t: number, w: number, h: number): string {
    const phoneEntrance = spring(Math.min(1, t * 1.8));
    const phoneY = interpolate(phoneEntrance, [0, 1], [h + 50, 310]);
    const phoneScale = interpolate(phoneEntrance, [0, 1], [0.85, 1.0]);

    // Scanning laser moves back and forth
    const scanY = 160 + Math.sin(t * Math.PI * 4) * 80;

    const screenUI = `
      <text x="12" y="28" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#0F172A">Scan to Order</text>
      <text x="12" y="52" font-family="Arial, sans-serif" font-size="13" fill="#64748B">Instant digital menu on your phone</text>
      
      <!-- QR Card -->
      <rect x="24" y="80" width="280" height="280" rx="28" fill="#F8FAFC" stroke="#E2E8F0" stroke-width="2"/>
      <!-- QR Symbol simulation -->
      <rect x="64" y="120" width="200" height="200" rx="16" fill="#1E293B"/>
      <rect x="80" y="136" width="60" height="60" rx="6" fill="#FFFFFF"/>
      <rect x="94" y="150" width="32" height="32" rx="4" fill="#1E293B"/>
      <rect x="188" y="136" width="60" height="60" rx="6" fill="#FFFFFF"/>
      <rect x="202" y="150" width="32" height="32" rx="4" fill="#1E293B"/>
      <rect x="80" y="244" width="60" height="60" rx="6" fill="#FFFFFF"/>
      <rect x="94" y="258" width="32" height="32" rx="4" fill="#1E293B"/>

      <!-- Scanning Laser -->
      ${MotionComponents.scanBeam(40, scanY, 288)}

      <!-- Bottom Card Button -->
      <rect x="24" y="420" width="280" height="56" rx="18" fill="#2563EB"/>
      <text x="164" y="455" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Open Digital Menu</text>
    `;

    return `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        ${MotionComponents.backgroundGrid(w, h)}
        ${MotionComponents.topHeader(w, spec.badgeText || "HOW IT WORKS", spec.headline, spec.subheadline)}
        ${MotionComponents.animatedPhone(180, phoneY, phoneScale, screenUI)}
        ${MotionComponents.brandFooter(w, spec.handle)}
      </svg>
    `;
  }

  /**
   * Scene Theme 2: Comparison Split (e.g. Traditional Paper vs Modern Digital)
   */
  private static renderComparisonScene(spec: MotionSceneSpec, t: number, w: number, h: number): string {
    const leftX = interpolate(spring(Math.min(1, t * 1.5)), [0, 1], [-250, 48]);
    const rightX = interpolate(spring(Math.min(1, Math.max(0, (t - 0.15) * 1.5))), [0, 1], [w + 50, 376]);

    return `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        ${MotionComponents.backgroundGrid(w, h)}
        ${MotionComponents.topHeader(w, spec.badgeText || "COMPARISON", spec.headline, spec.subheadline)}

        <!-- Left Side: Traditional / Old way -->
        <g transform="translate(${leftX}, 280)" filter="url(#card-shadow)">
          <rect width="296" height="540" rx="28" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
          <rect x="24" y="24" width="90" height="28" rx="14" fill="#FEE2E2"/>
          <text x="38" y="43" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#991B1B">OLD WAY</text>
          
          <text x="24" y="90" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#0F172A">${escapeXml(spec.analogyPair?.left || "Paper Menu")}</text>
          
          <!-- Illustrated Document -->
          <rect x="36" y="130" width="224" height="240" rx="16" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5"/>
          <line x1="56" y1="170" x2="180" y2="170" stroke="#94A3B8" stroke-width="3" stroke-linecap="round"/>
          <line x1="56" y1="195" x2="240" y2="195" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round"/>
          <line x1="56" y1="220" x2="220" y2="220" stroke="#CBD5E1" stroke-width="3" stroke-linecap="round"/>
          
          <text x="24" y="430" font-family="Arial, sans-serif" font-size="14" fill="#64748B">• Slow manual orders</text>
          <text x="24" y="460" font-family="Arial, sans-serif" font-size="14" fill="#64748B">• High printing cost</text>
        </g>

        <!-- Right Side: Digital / New way -->
        <g transform="translate(${rightX}, 280)" filter="url(#card-shadow)">
          <rect width="296" height="540" rx="28" fill="#1E3A5F" stroke="#2563EB" stroke-width="2"/>
          <rect x="24" y="24" width="105" height="28" rx="14" fill="#DBEAFE"/>
          <text x="36" y="43" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#1E40AF">SMART WAY</text>
          
          <text x="24" y="90" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF">${escapeXml(spec.analogyPair?.right || "QR Smart Menu")}</text>

          <!-- Illustrated Screen -->
          <rect x="36" y="130" width="224" height="240" rx="16" fill="#0F172A" stroke="#38BDF8" stroke-width="2"/>
          <rect x="52" y="150" width="80" height="20" rx="6" fill="#2563EB"/>
          <rect x="52" y="185" width="192" height="60" rx="10" fill="#1E293B"/>
          <rect x="52" y="260" width="192" height="60" rx="10" fill="#1E293B"/>

          <text x="24" y="430" font-family="Arial, sans-serif" font-size="14" fill="#93C5FD">• Instant menu updates</text>
          <text x="24" y="460" font-family="Arial, sans-serif" font-size="14" fill="#93C5FD">• Direct to kitchen order</text>
        </g>

        ${MotionComponents.brandFooter(w, spec.handle)}
      </svg>
    `;
  }

  /**
   * Scene Theme 3: Data Flow / Architecture (Customer Phone ➔ Server / Kitchen)
   */
  private static renderDataFlowScene(spec: MotionSceneSpec, t: number, w: number, h: number): string {
    const packetProgress = (t * 2.2) % 1.0;

    return `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        ${MotionComponents.backgroundGrid(w, h)}
        ${MotionComponents.topHeader(w, spec.badgeText || "DIRECT ARCHITECTURE", spec.headline, spec.subheadline)}

        <!-- Top Source: Phone Client -->
        <g transform="translate(180, 240)" filter="url(#card-shadow)">
          <rect width="360" height="150" rx="24" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
          <circle cx="50" cy="50" r="24" fill="#EFF6FF"/>
          <text x="50" y="56" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#2563EB" text-anchor="middle">📱</text>
          <text x="90" y="48" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#0F172A">Customer Phone</text>
          <text x="90" y="74" font-family="Arial, sans-serif" font-size="13" fill="#64748B">Order item selected &amp; confirmed</text>
          <rect x="36" y="100" width="288" height="32" rx="8" fill="#ECFDF5"/>
          <text x="50" y="122" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#059669">✓ Order Sent: 2x Smash Burger</text>
        </g>

        <!-- Dynamic Data Flow Packet -->
        ${MotionComponents.dataPacket(360, 400, 360, 680, packetProgress)}

        <!-- Middle Badge: API / Cloud -->
        <g transform="translate(250, 520)">
          <rect width="220" height="44" rx="22" fill="#2563EB" filter="url(#glow-blue)"/>
          <text x="110" y="28" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF" text-anchor="middle">⚡ Realtime WebSocket API</text>
        </g>

        <!-- Bottom Destination: Kitchen Display Terminal -->
        <g transform="translate(120, 680)" filter="url(#card-shadow)">
          <rect width="480" height="300" rx="28" fill="#0F172A" stroke="#334155" stroke-width="2"/>
          
          <!-- Terminal Header -->
          <rect x="24" y="24" width="432" height="40" rx="12" fill="#1E293B"/>
          <text x="40" y="50" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#F8FAFC">Kitchen Display System</text>
          <circle cx="430" cy="44" r="6" fill="#10B981"/>

          <!-- Order Ticket Card -->
          <rect x="24" y="80" width="200" height="180" rx="16" fill="#1E3A5F"/>
          <text x="40" y="112" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#FFFFFF">#128 · Table 05</text>
          <text x="40" y="145" font-family="Arial, sans-serif" font-size="14" fill="#93C5FD">2x Smash Burger</text>
          <text x="40" y="170" font-family="Arial, sans-serif" font-size="13" fill="#64748B">Prep time: 15 min</text>
          <rect x="40" y="195" width="168" height="36" rx="8" fill="#2563EB"/>
          <text x="124" y="218" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Preparing Order</text>

          <rect x="256" y="80" width="200" height="180" rx="16" fill="#1E293B"/>
          <text x="272" y="112" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#94A3B8">#127 · Table 02</text>
          <text x="272" y="145" font-family="Arial, sans-serif" font-size="14" fill="#CBD5E1">1x Farm Pizza</text>
          <rect x="272" y="195" width="168" height="36" rx="8" fill="#059669"/>
          <text x="356" y="218" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Ready to Serve</text>
        </g>

        ${MotionComponents.brandFooter(w, spec.handle)}
      </svg>
    `;
  }

  /**
   * Scene Theme 4: Feature Cards & Interactive UI
   */
  private static renderFeatureCardsScene(spec: MotionSceneSpec, t: number, w: number, h: number): string {
    const card1Y = interpolate(spring(Math.min(1, t * 1.5)), [0, 1], [300, 240]);
    const card2Y = interpolate(spring(Math.min(1, Math.max(0, (t - 0.15) * 1.5))), [0, 1], [520, 460]);
    const card3Y = interpolate(spring(Math.min(1, Math.max(0, (t - 0.3) * 1.5))), [0, 1], [740, 680]);

    return `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        ${MotionComponents.backgroundGrid(w, h)}
        ${MotionComponents.topHeader(w, spec.badgeText || "KEY BENEFITS", spec.headline, spec.subheadline)}

        <!-- Card 1 -->
        <g transform="translate(48, ${card1Y})" filter="url(#card-shadow)">
          <rect width="624" height="180" rx="24" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
          <circle cx="64" cy="64" r="28" fill="#EFF6FF"/>
          <text x="64" y="72" font-family="Arial, sans-serif" font-size="24" text-anchor="middle">🚀</text>
          <text x="115" y="60" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#0F172A">Zero App Installation</text>
          <text x="115" y="92" font-family="Arial, sans-serif" font-size="15" fill="#64748B">Customers scan QR directly with camera without downloading any app.</text>
        </g>

        <!-- Card 2 -->
        <g transform="translate(48, ${card2Y})" filter="url(#card-shadow)">
          <rect width="624" height="180" rx="24" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
          <circle cx="64" cy="64" r="28" fill="#FEF3C7"/>
          <text x="64" y="72" font-family="Arial, sans-serif" font-size="24" text-anchor="middle">⚡</text>
          <text x="115" y="60" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#0F172A">Real-time Order Routing</text>
          <text x="115" y="92" font-family="Arial, sans-serif" font-size="15" fill="#64748B">Orders route straight to kitchen monitors with zero waiter miscommunication.</text>
        </g>

        <!-- Card 3 -->
        <g transform="translate(48, ${card3Y})" filter="url(#card-shadow)">
          <rect width="624" height="180" rx="24" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2"/>
          <circle cx="64" cy="64" r="28" fill="#ECFDF5"/>
          <text x="64" y="72" font-family="Arial, sans-serif" font-size="24" text-anchor="middle">📈</text>
          <text x="115" y="60" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#0F172A">Higher Table Turnover</text>
          <text x="115" y="92" font-family="Arial, sans-serif" font-size="15" fill="#64748B">Faster ordering and payment increases restaurant revenue by 25-30%.</text>
        </g>

        ${MotionComponents.brandFooter(w, spec.handle)}
      </svg>
    `;
  }

  /**
   * Scene Theme 5: Brand Outro & Call to Action
   */
  private static renderCTAOutroScene(spec: MotionSceneSpec, t: number, w: number, h: number): string {
    const cardScale = spring(Math.min(1, t * 1.5));
    const btnPulse = 1.0 + Math.sin(t * Math.PI * 6) * 0.04;

    return `
      <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
        ${MotionComponents.backgroundGrid(w, h, true)}

        <g transform="translate(80, 360) scale(${cardScale})" filter="url(#card-shadow)">
          <rect width="560" height="520" rx="36" fill="#0F172A" stroke="#334155" stroke-width="3"/>
          
          <!-- Avatar Icon Badge -->
          <circle cx="280" cy="110" r="54" fill="#1E3A5F" stroke="#38BDF8" stroke-width="3"/>
          <text x="280" y="125" font-family="Arial, sans-serif" font-size="44" text-anchor="middle">👨‍💻</text>

          <text x="280" y="210" font-family="Arial, sans-serif" font-size="30" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Learn With Avee</text>
          <text x="280" y="248" font-family="Arial, sans-serif" font-size="16" fill="#94A3B8" text-anchor="middle">Master Modern AI, Tech &amp; Coding in Hindi</text>

          <!-- Follow Button with subtle pulse -->
          <g transform="translate(280, 340) scale(${btnPulse})">
            <rect x="-160" y="-30" width="320" height="60" rx="30" fill="#2563EB" filter="url(#glow-blue)"/>
            <text x="0" y="9" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Follow @learnwithavee</text>
          </g>

          <text x="280" y="440" font-family="Arial, sans-serif" font-size="14" fill="#64748B" text-anchor="middle">Save this Reel for later &amp; share with friends!</text>
        </g>
      </svg>
    `;
  }

  /**
   * Generates a complete 9:16 animated MP4 clip with audio mixing for a scene.
   */
  static async renderSceneClip(
    ffmpegBinary: string,
    workDir: string,
    spec: MotionSceneSpec,
    voiceBuffer: Buffer,
    voiceDurationSeconds: number
  ): Promise<Buffer> {
    const fps = 30;
    const duration = Math.max(3.0, voiceDurationSeconds + 0.4);
    const totalFrames = Math.ceil(duration * fps);
    const clipPath = path.join(workDir, `motion-scene-${spec.sceneNumber}.mp4`);
    const voicePath = path.join(workDir, `voice-${spec.sceneNumber}.mp3`);
    const sfxPath = path.join(workDir, `sfx-${spec.sceneNumber}.wav`);
    const musicPath = path.join(workDir, `music-${spec.sceneNumber}.wav`);

    await fs.writeFile(voicePath, voiceBuffer);

    // Generate appropriate procedural sound effect
    const sfxType = spec.sceneNumber === 1 ? "whoosh" : spec.sceneNumber === spec.totalScenes ? "success" : "pop";
    const sfxBuffer = AudioService.generateSoundEffect(sfxType);
    await fs.writeFile(sfxPath, sfxBuffer);

    // Generate ambient background bed
    const musicBuffer = AudioService.generateAmbientBed(duration + 2);
    await fs.writeFile(musicPath, musicBuffer);

    // Spawn FFmpeg to encode image2pipe input at 720x1280 30FPS
    const ffmpeg = spawn(ffmpegBinary, [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "image2pipe",
      "-r", String(fps),
      "-i", "pipe:0",
      "-i", voicePath,
      "-i", sfxPath,
      "-i", musicPath,
      "-filter_complex",
      "[1:a]volume=1.45,bass=g=2:f=180[vvoice];" +
      "[2:a]volume=0.35,adelay=100|100[vsfx];" +
      "[3:a]volume=0.15[vmusic];" +
      "[vvoice][vsfx][vmusic]amix=inputs=3:duration=longest:dropout_transition=2[amixed];" +
      `[amixed]atrim=0:${duration.toFixed(2)}[aout]`,
      "-map", "0:v", "-map", "[aout]",
      "-t", duration.toFixed(2),
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "22", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k",
      clipPath
    ]);

    let ffmpegErr = "";
    ffmpeg.stderr.on("data", (d) => { ffmpegErr += d.toString(); });
    ffmpeg.stdin.on("error", () => {
      // Ignore EPIPE/EOF on closed pipe to prevent Node process termination
    });

    // Stream rendered vector PNG frames into FFmpeg with backpressure handling
    for (let frame = 0; frame < totalFrames; frame++) {
      if (ffmpeg.killed || ffmpeg.exitCode !== null) break;
      const t = frame / totalFrames;
      const svg = this.renderFrame(spec, t, 720, 1280);
      const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 720 } });
      const png = resvg.render().asPng();
      
      const canWrite = ffmpeg.stdin.write(png);
      if (!canWrite) {
        await new Promise<void>((resolve) => {
          ffmpeg.stdin.once("drain", () => resolve());
        });
      }
    }

    if (ffmpeg.stdin.writable) {
      ffmpeg.stdin.end();
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg motion render failed (code ${code}): ${ffmpegErr}`));
      });
      ffmpeg.on("error", reject);
    });

    await Promise.all([
      fs.unlink(voicePath).catch(() => undefined),
      fs.unlink(sfxPath).catch(() => undefined),
      fs.unlink(musicPath).catch(() => undefined),
    ]);

    return fs.readFile(clipPath);
  }
}
