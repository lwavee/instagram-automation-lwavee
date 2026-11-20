import axios from "axios";
import { ResearchArticle } from "../models/ResearchArticle";
import { ContentIdea } from "../models/ContentIdea";
import { AIService } from "./aiService";

export interface SearchArticleItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  topic: string;
  keywords: string[];
  trendingScore: number;
  publishedAt?: Date;
}

export class ResearchService {
  /**
   * Discovers trending AI & Tech articles based on topic and keywords
   */
  public static async discoverTrending(
    topic: string,
    keywords: string[] = []
  ): Promise<SearchArticleItem[]> {
    const results: SearchArticleItem[] = [];

    // SEARCH_API_KEY previously sent keys for unrelated providers to Tavily.
    // Only use a key explicitly configured for Tavily.
    const searchApiKey = process.env.TAVILY_API_KEY;

    if (searchApiKey) {
      try {
        const query = `${topic} ${keywords.join(" ")} latest tech news 2026`;
        const res = await axios.post(
          "https://api.tavily.com/search",
          {
            api_key: searchApiKey,
            query,
            search_depth: "basic",
            max_results: 6,
          },
          { timeout: 8000 }
        );

        if (res.data?.results) {
          for (const item of res.data.results) {
            if (typeof item.title !== "string" || typeof item.url !== "string" || !/^https?:\/\//i.test(item.url)) continue;
            results.push({
              title: item.title,
              summary: item.content || "",
              url: item.url,
              source: "Tavily Search",
              topic,
              keywords: keywords.length ? keywords : [topic],
              trendingScore: 0,
              ...(item.published_date && Number.isFinite(Date.parse(item.published_date))
                ? { publishedAt: new Date(item.published_date) }
                : {}),
            });
          }
        }
      } catch (err: any) {
        console.warn("External search API failed, falling back to real tech news feeds:", err.message);
      }
    }

    // 2. Real Tech & AI Feeds (Hacker News Algolia API & TechCrunch RSS endpoints)
    if (results.length === 0) {
      try {
        const encodedQuery = encodeURIComponent(`${topic} AI`);
        const hnRes = await axios.get(
          `https://hn.algolia.com/api/v1/search?query=${encodedQuery}&tags=story&hitsPerPage=6`,
          { timeout: 6000 }
        );

        if (hnRes.data?.hits) {
          for (const hit of hnRes.data.hits) {
            if (hit.title && (hit.url || hit.story_url)) {
              results.push({
                title: hit.title,
                summary: `Points: ${hit.points || 0} | Comments: ${hit.num_comments || 0} | Author: ${hit.author}`,
                url: hit.url || hit.story_url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
                source: "Hacker News AI Feed",
                topic,
                keywords: keywords.length ? keywords : [topic],
                trendingScore: Math.min(100, Math.max(0, Number(hit.points) || 0)),
                ...(hit.created_at && Number.isFinite(Date.parse(hit.created_at))
                  ? { publishedAt: new Date(hit.created_at) }
                  : {}),
              });
            }
          }
        }
      } catch (hnErr: any) {
        console.warn("Hacker News API search fallback error:", hnErr.message);
      }
    }

    // Save and deduplicate in database
    const savedArticles: SearchArticleItem[] = [];
    for (const item of results) {
      try {
        const existing = await ResearchArticle.findOne({ url: item.url });
        if (!existing) {
          await ResearchArticle.create(item);
          savedArticles.push(item);
        } else {
          savedArticles.push(item);
        }
      } catch (dbErr) {
        savedArticles.push(item);
      }
    }

    return savedArticles;
  }

  /**
   * Generates 2-3 Instagram Reel content ideas from a research article
   */
  public static async generateIdeasFromArticle(articleId: string): Promise<any[]> {
    const article = await ResearchArticle.findById(articleId);
    if (!article) {
      throw new Error("Research article not found");
    }

    // Avoid duplicate ideas
    const existingIdeas = await ContentIdea.find({ sourceArticleId: article._id });
    if (existingIdeas.length > 0) {
      return existingIdeas;
    }

    const ideasToCreate = [
      {
        topic: article.topic,
        title: `${article.title} — Quick 45s Reel Breakdown`,
        hook: `Yeh update aapke AI workflow ke liye kyun relevant ho sakta hai? Source ke saath dekhte hain.`,
        summary: article.summary.slice(0, 200),
        targetFormat: "REEL",
        angle: "Fast Tech Update & Practical How-To",
        estimatedDurationSeconds: 45,
        tags: [...article.keywords, "LearnWithAvee", "AITrending"],
        sourceArticleId: article._id,
        sourceUrl: article.url,
        status: "pending",
      },
      {
        topic: article.topic,
        title: `What this ${article.topic} update could change`,
        hook: `Is update ko use karne se pehle yeh do baatein check karein.`,
        summary: `Common mistakes vs best practices based on: ${article.title}`,
        targetFormat: "REEL",
        angle: "Contrarian & Common Mistakes",
        estimatedDurationSeconds: 35,
        tags: [...article.keywords, "AITricks", "TechHacks"],
        sourceArticleId: article._id,
        sourceUrl: article.url,
        status: "pending",
      },
    ];

    const created = await ContentIdea.insertMany(ideasToCreate);
    article.isUsed = true;
    article.ideasGeneratedCount += created.length;
    await article.save();

    return created;
  }
}

