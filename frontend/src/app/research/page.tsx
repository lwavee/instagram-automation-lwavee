"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  Search,
  Sparkles,
  ExternalLink,
  Plus,
  Check,
  X,
  ArrowRight,
  TrendingUp,
  Bookmark,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function ContentResearchPage() {
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("Artificial Intelligence");
  const [customKeyword, setCustomKeyword] = useState("");
  const [keywords, setKeywords] = useState<string[]>(["ChatGPT", "Prompting", "AI Tools"]);
  const [articles, setArticles] = useState<any[]>([]);
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [topicsData, articlesData, ideasData] = await Promise.all([
        api.getTopics(),
        api.getArticles(),
        api.getContentIdeas(),
      ]);

      if (topicsData?.topics) setTopics(topicsData.topics);
      if (articlesData?.articles) setArticles(articlesData.articles);
      if (ideasData?.ideas) setIdeas(ideasData.ideas);
    } catch (err: any) {
      console.warn("Could not load initial research data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (customKeyword.trim() && !keywords.includes(customKeyword.trim())) {
      setKeywords([...keywords, customKeyword.trim()]);
      setCustomKeyword("");
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleDiscover = async () => {
    try {
      setLoading(true);
      setStatusMsg("Searching real AI & tech sources for trending topics...");
      const res = await api.discoverResearch({
        topic: selectedTopic,
        keywords,
      });

      setStatusMsg(`Found ${res?.articlesFound || 0} trending articles!`);
      const updatedArticles = await api.getArticles();
      if (updatedArticles?.articles) setArticles(updatedArticles.articles);
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateIdeas = async (articleId: string) => {
    try {
      setLoading(true);
      setStatusMsg("Generating 45s Reel angles from article...");
      await api.generateIdeasFromArticle(articleId);
      const updatedIdeas = await api.getContentIdeas();
      if (updatedIdeas?.ideas) setIdeas(updatedIdeas.ideas);
      setStatusMsg("Reel ideas generated successfully!");
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIdeaStatus = async (ideaId: string, status: "approved" | "rejected") => {
    try {
      await api.updateIdeaStatus(ideaId, { status });
      setIdeas(
        ideas.map((i) => (i._id === ideaId ? { ...i, status } : i))
      );
    } catch (err: any) {
      setStatusMsg(`Error updating status: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Compass className="w-8 h-8 text-brand-400" />
            AI Content Research Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover verified tech news & trending AI topics without fabricating or hallucinating news.
          </p>
        </div>
        <Button
          variant="gradient"
          size="sm"
          onClick={handleDiscover}
          isLoading={loading}
          className="gap-2"
        >
          <Search className="w-4 h-4" />
          Discover Trending Now
        </Button>
      </div>

      {statusMsg && (
        <div className="p-3 text-xs rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Discovery Config Box */}
      <Card>
        <CardHeader>
          <CardTitle>Topic & Keyword Targeting</CardTitle>
          <CardDescription>
            Select primary AI domain and add specific keywords to focus research
          </CardDescription>
        </CardHeader>

        {/* Topic Pills */}
        <div className="space-y-4 pt-2">
          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-2">
              Primary Topic Area:
            </span>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTopic(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedTopic === t
                      ? "bg-brand-600 text-white shadow-md shadow-brand-500/25"
                      : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <span className="text-xs font-semibold text-muted-foreground block mb-2">
              Specific Keywords & Filters:
            </span>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-foreground text-xs border border-border"
                >
                  {kw}
                  <button
                    onClick={() => handleRemoveKeyword(kw)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <form onSubmit={handleAddKeyword} className="flex gap-2 max-w-sm">
              <input
                type="text"
                placeholder="Add keyword (e.g. Agentic AI)..."
                value={customKeyword}
                onChange={(e) => setCustomKeyword(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <Button type="submit" variant="secondary" size="sm" className="gap-1">
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </form>
          </div>
        </div>
      </Card>

      {/* Discovered Articles List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-brand-400" />
            Verified Research Results ({articles.length})
          </h2>
          <Button variant="ghost" size="sm" onClick={loadData} className="gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((art) => (
            <Card key={art._id} className="flex flex-col justify-between hover:border-brand-500/40 transition-all">
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <Badge variant="outline">{art.source}</Badge>
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <TrendingUp className="w-3 h-3" /> Score {art.trendingScore}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-foreground leading-snug line-clamp-2 mb-2">
                  {art.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
                  {art.summary}
                </p>
              </div>

              <div className="border-t border-border/60 pt-3 flex items-center justify-between">
                <a
                  href={art.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-400 hover:underline flex items-center gap-1"
                >
                  Source <ExternalLink className="w-3 h-3" />
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleGenerateIdeas(art._id)}
                  className="text-xs gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                  Generate Ideas
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Generated Content Ideas Section */}
      <div className="space-y-4 pt-6 border-t border-border">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-pink-400" />
          Content Ideas Queue ({ideas.length})
        </h2>

        <div className="divide-y divide-border/60 rounded-xl border border-border bg-card/40">
          {ideas.length > 0 ? (
            ideas.map((idea) => (
              <div key={idea._id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <Badge variant={idea.status === "approved" ? "success" : idea.status === "rejected" ? "destructive" : "warning"}>
                      {idea.status}
                    </Badge>
                    <span className="text-xs font-semibold text-brand-400">{idea.topic}</span>
                    <span className="text-[11px] text-muted-foreground">• ~{idea.estimatedDurationSeconds}s Reel</span>
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">{idea.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    <strong className="text-foreground">Opening Hook:</strong> &quot;{idea.hook}&quot;
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {idea.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUpdateIdeaStatus(idea._id, "approved")}
                        className="text-xs gap-1 text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleUpdateIdeaStatus(idea._id, "rejected")}
                        className="text-xs gap-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </Button>
                    </>
                  )}

                  {idea.status === "approved" && (
                    <Link href={`/scripts?ideaId=${idea._id}`}>
                      <Button size="sm" variant="gradient" className="text-xs gap-1">
                        Write Script <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  )}

                  {idea.status === "scripted" && (
                    <Badge variant="outline" className="text-brand-300">
                      Script Created
                    </Badge>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No ideas in queue. Discover articles and click &quot;Generate Ideas&quot; to build viral Reel concepts!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

