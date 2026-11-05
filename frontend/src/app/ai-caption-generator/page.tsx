"use client";

import React, { useState } from "react";
import { Bot, Sparkles, Copy, Check, Hash, RefreshCw, Send, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";

export default function AICaptionGeneratorPage() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("engaging");
  const [language, setLanguage] = useState("hi-en");
  const [format, setFormat] = useState("REEL");
  const [copied, setCopied] = useState(false);

  // Sample generated state for foundation preview
  const [generatedCaption, setGeneratedCaption] = useState(
    "🚨 5 AI Tools that feel ILLEGAL to know in 2026! 👇\n\nIf you are still doing everything manually, you are wasting 10+ hours every single week. Save this Reel before you forget!\n\n1. Manus AI — Autonomous agent that builds full apps while you sleep.\n2. DeepSeek R1 — Open-source reasoning that beats paid models.\n3. ElevenLabs v3 — Studio-grade voice cloning with emotion.\n\n💬 Comment 'AI' below and I will instantly DM you the direct links to all 5 tools!\n\n👉 Follow @lw_avee for daily AI updates, prompts, and automation tutorials!"
  );
  const [hashtags, setHashtags] = useState(
    "#LearnWithAvee #AITools #ArtificialIntelligence #InstagramAutomation #TechReels #NoCode #OpenRouter #FutureTech #ReelsIndia #ProductivityHacks"
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(`${generatedCaption}\n\n${hashtags}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Bot className="w-7 h-7 text-brand-400" />
            AI Caption & Hashtag Generator
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Engineered for @lw_avee • High-retention hooks, conversational Hindi/Hinglish copy, and viral hashtags.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Controls Card */}
        <Card className="p-6 space-y-5">
          <CardHeader className="p-0">
            <CardTitle className="text-base">Prompt & Parameters</CardTitle>
            <CardDescription>Customize tone, format, and language for OpenRouter AI</CardDescription>
          </CardHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Content Topic or Key Idea:
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                placeholder="e.g., Top 5 free AI websites that feel illegal to know in 2026..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Tone:</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="engaging">Engaging / Viral</option>
                  <option value="educational">Educational / Deep-Dive</option>
                  <option value="humorous">Humorous / Relatable</option>
                  <option value="urgent">Urgent / FOMO</option>
                  <option value="storytelling">Storytelling</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Language:</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="hi-en">Hinglish (Conversational)</option>
                  <option value="en">English (Global)</option>
                  <option value="hi">Hindi (Devanagari)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Format:</label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="REEL">Instagram Reel (9:16)</option>
                  <option value="POST">Single Post</option>
                  <option value="CAROUSEL">Carousel</option>
                </select>
              </div>
            </div>

            <Button variant="gradient" size="md" className="w-full gap-2">
              <Sparkles className="w-4 h-4" />
              Generate Caption & Hashtags
            </Button>
          </div>
        </Card>

        {/* Output Preview Card */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              Generated Output
            </h3>
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Full Copy"}
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-secondary/40 border border-border/80 text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">
            {generatedCaption}
          </div>

          <div className="p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-mono break-words">
            {hashtags}
          </div>

          <div className="pt-2 flex justify-end">
            <Link href="/publishing-queue">
              <Button variant="outline" size="sm" className="gap-2">
                Send to Publishing Queue <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
