import axios from "axios";

export interface ObservedYouTubeVideo {
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  viewsPerHour: number;
  url: string;
}

export class YouTubeResearchError extends Error {
  constructor(message: string, readonly statusCode = 503) {
    super(message);
    (this as Error & { publicMessage?: string }).publicMessage = message;
  }
}

export class YouTubeResearchService {
  static async analyze(niche: string): Promise<ObservedYouTubeVideo[]> {
    const key = process.env.YOUTUBE_DATA_API_KEY;
    if (!key) throw new YouTubeResearchError("Add a YouTube Data API key to the backend as YOUTUBE_DATA_API_KEY to analyze niche videos.");

    const query = `${niche} India tutorial`;
    const publishedAfter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    try {
      const search = await axios.get("https://youtube.googleapis.com/youtube/v3/search", {
        params: { key, part: "snippet", type: "video", order: "viewCount", maxResults: 25, publishedAfter, q: query, videoDuration: "short" },
        timeout: 20000,
        maxRedirects: 0,
      });
      const ids = (search.data?.items || []).map((item: any) => item?.id?.videoId).filter((id: unknown): id is string => typeof id === "string");
      if (!ids.length) return [];

      const details = await axios.get("https://youtube.googleapis.com/youtube/v3/videos", {
        params: { key, part: "snippet,statistics", id: ids.join(",") },
        timeout: 20000,
        maxRedirects: 0,
      });
      const now = Date.now();
      return (details.data?.items || []).flatMap((item: any) => {
        const publishedAt = item?.snippet?.publishedAt;
        const views = Number(item?.statistics?.viewCount);
        if (!item?.id || !item?.snippet?.channelId || !item?.snippet?.title || !publishedAt || !Number.isFinite(views)) return [];
        const ageHours = Math.max(1, (now - Date.parse(publishedAt)) / 3_600_000);
        return [{
          videoId: String(item.id),
          title: String(item.snippet.title).slice(0, 180),
          channelId: String(item.snippet.channelId),
          channelTitle: String(item.snippet.channelTitle || "YouTube creator").slice(0, 100),
          publishedAt,
          viewCount: views,
          viewsPerHour: Math.round(views / ageHours),
          url: `https://www.youtube.com/watch?v=${encodeURIComponent(String(item.id))}`,
        }];
      }).sort((a: ObservedYouTubeVideo, b: ObservedYouTubeVideo) => b.viewsPerHour - a.viewsPerHour).slice(0, 12);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 403) throw new YouTubeResearchError("YouTube Data API access was denied. Check that YouTube Data API v3 is enabled, billing/quota is valid, and the key is restricted to this API.", 502);
      throw new YouTubeResearchError("Could not retrieve public YouTube niche research. Check the Data API key, quota, and backend network access.", 502);
    }
  }
}
