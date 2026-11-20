import { afterEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { YouTubeResearchService } from "../src/services/youtubeResearchService";

vi.mock("axios", () => ({ default: { get: vi.fn(), isAxiosError: vi.fn() } }));

const originalKey = process.env.YOUTUBE_DATA_API_KEY;
afterEach(() => {
  if (originalKey === undefined) delete process.env.YOUTUBE_DATA_API_KEY;
  else process.env.YOUTUBE_DATA_API_KEY = originalKey;
  vi.mocked(axios.get).mockReset();
  vi.mocked(axios.isAxiosError).mockReset();
});

describe("YouTube niche research", () => {
  it("rejects missing Data API configuration without returning invented trends", async () => {
    delete process.env.YOUTUBE_DATA_API_KEY;
    await expect(YouTubeResearchService.analyze("AI tools")).rejects.toThrow(/YOUTUBE_DATA_API_KEY/);
    expect(axios.get).not.toHaveBeenCalled();
  });

  it("computes observed views-per-hour and ranks current videos", async () => {
    process.env.YOUTUBE_DATA_API_KEY = "test-key";
    const recent = new Date(Date.now() - 2 * 3_600_000).toISOString();
    vi.mocked(axios.get)
      .mockResolvedValueOnce({ data: { items: [{ id: { videoId: "first" } }, { id: { videoId: "second" } }] } } as any)
      .mockResolvedValueOnce({ data: { items: [
        { id: "first", snippet: { title: "First", channelId: "channel-a", channelTitle: "Creator A", publishedAt: recent }, statistics: { viewCount: "1000" } },
        { id: "second", snippet: { title: "Second", channelId: "channel-b", channelTitle: "Creator B", publishedAt: recent }, statistics: { viewCount: "4000" } },
      ] } } as any);

    const videos = await YouTubeResearchService.analyze("AI tools");
    expect(videos).toHaveLength(2);
    expect(videos[0].videoId).toBe("second");
    expect(videos[0].viewsPerHour).toBeGreaterThan(videos[1].viewsPerHour);
    expect(videos[0].url).toBe("https://www.youtube.com/watch?v=second");
    expect(vi.mocked(axios.get).mock.calls[0][1]?.params).toMatchObject({ order: "viewCount", publishedAfter: expect.any(String) });
  });

  it("returns an empty result when YouTube has no matching public videos", async () => {
    process.env.YOUTUBE_DATA_API_KEY = "test-key";
    vi.mocked(axios.get).mockResolvedValueOnce({ data: { items: [] } } as any);
    await expect(YouTubeResearchService.analyze("niche with no results")).resolves.toEqual([]);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});
