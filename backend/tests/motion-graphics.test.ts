import { describe, it, expect } from "vitest";
import { MotionGraphicsEngine, spring, interpolate, easeOutCubic, MotionSceneSpec } from "../src/services/motionGraphicsEngine";
import { Resvg } from "@resvg/resvg-js";

describe("MotionGraphicsEngine & Vector Renderer", () => {
  it("interpolates spring and cubic easing math accurately", () => {
    expect(spring(0)).toBeCloseTo(0, 1);
    expect(spring(1)).toBeCloseTo(1, 1);
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(interpolate(0.5, [0, 1], [100, 200])).toBe(150);
  });

  it("renders valid high-res SVGs for all 5 core motion graphics themes", () => {
    const themes: MotionSceneSpec["theme"][] = [
      "phone-demo",
      "comparison",
      "data-flow",
      "feature-cards",
      "cta-outro",
    ];

    for (const theme of themes) {
      const spec: MotionSceneSpec = {
        sceneNumber: 1,
        totalScenes: 4,
        durationSeconds: 5,
        theme,
        headline: "Restaurant QR Ordering Explained",
        subheadline: "Smart contactless digital menu systems",
        badgeText: "AI & TECH",
        voiceoverText: "Restaurant mein QR scan karte hi menu kaise aa jata hai?",
        onScreenText: "Scan to Order",
        analogyPair: { left: "Paper Menu", right: "Smart QR Menu" },
        handle: "@learnwithavee",
      };

      const svg = MotionGraphicsEngine.renderFrame(spec, 0.5, 720, 1280);
      try {
        const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 720 } });
        const png = resvg.render().asPng();
        expect(png).toBeInstanceOf(Buffer);
        expect(png.length).toBeGreaterThan(1000);
      } catch (err: any) {
        console.error(`Theme [${theme}] failed:`, err.message);
        const lines = svg.split("\n");
        console.error("Line 34:", lines[33]);
        console.error("Line 35:", lines[34]);
        console.error("Line 36:", lines[35]);
        console.error("Line 37:", lines[36]);
        throw err;
      }
    }
  });
});
