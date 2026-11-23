import { describe, it, expect } from "vitest";
import { PPMCanvas, renderSceneCard } from "../src/utils/ppmRenderer";

describe("PPM Canvas & Card Renderer", () => {
  it("creates a valid PPM canvas buffer with correct dimensions and header", () => {
    const canvas = new PPMCanvas(720, 1280);
    canvas.fillGradient([30, 20, 40], [5, 5, 10]);
    canvas.drawBadge("TEST BRAND", 50, [255, 180, 0], [20, 20, 20], 2);
    canvas.drawCenteredText("Test Center", 150, 3, [255, 255, 255]);

    const buffer = canvas.toBuffer();
    expect(buffer).toBeInstanceOf(Buffer);
    const header = Buffer.from(buffer.subarray(0, 15)).toString("ascii");
    expect(header).toContain("P6");
    expect(header).toContain("720 1280");
    expect(buffer.length).toBe(720 * 1280 * 3 + header.split("\n").slice(0, 3).join("\n").length + 1);
  });

  it("renders a full scene card without errors across all theme styles", () => {
    for (let sceneNumber = 1; sceneNumber <= 4; sceneNumber++) {
      const card = renderSceneCard({
        sceneNumber,
        totalScenes: 4,
        reelTitle: "Top 5 AI Tools Every Creator Needs",
        onScreenText: "Automate your workflows in seconds with these hidden AI platforms",
        voiceoverText: "Kya aapko pata hai ki ye tools aapka 10 ghante ka kaam 10 minute me kar sakte hain?",
        handle: "@learnwithavee",
      });

      expect(card).toBeInstanceOf(Buffer);
      expect(card.length).toBeGreaterThan(2_700_000);
      expect(Buffer.from(card.subarray(0, 3)).toString("ascii")).toBe("P6\n");
    }
  });
});
