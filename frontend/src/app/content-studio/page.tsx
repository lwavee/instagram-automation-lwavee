"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Film, Image as ImageIcon, Layers, Plus, Calendar, Clock, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function ContentStudioPage() {
  const [selectedType, setSelectedType] = useState<"REEL" | "POST" | "CAROUSEL">("REEL");

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-brand-400" />
            Content Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, draft, and schedule Instagram Reels, Carousels, and Posts for @lw_avee
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/ai-caption-generator">
            <Button variant="gradient" size="sm" className="gap-2">
              <Sparkles className="w-4 h-4" />
              AI Caption Generator
            </Button>
          </Link>
        </div>
      </div>

      {/* Format Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          onClick={() => setSelectedType("REEL")}
          className={`cursor-pointer transition-all border-2 ${
            selectedType === "REEL"
              ? "border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/15"
              : "border-border hover:border-brand-500/50"
          }`}
        >
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center mb-3">
              <Film className="w-5 h-5" />
            </div>
            <CardTitle>Instagram Reel</CardTitle>
            <CardDescription>
              9:16 vertical video engineered with 2-second visual hooks, audio voiceover script, and high retention.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card
          onClick={() => setSelectedType("CAROUSEL")}
          className={`cursor-pointer transition-all border-2 ${
            selectedType === "CAROUSEL"
              ? "border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/15"
              : "border-border hover:border-brand-500/50"
          }`}
        >
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <CardTitle>Carousel Post</CardTitle>
            <CardDescription>
              Multi-slide step-by-step swipeable slides for tutorials, tool rundowns, and actionable tips.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card
          onClick={() => setSelectedType("POST")}
          className={`cursor-pointer transition-all border-2 ${
            selectedType === "POST"
              ? "border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/15"
              : "border-border hover:border-brand-500/50"
          }`}
        >
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <ImageIcon className="w-5 h-5" />
            </div>
            <CardTitle>Single Image Feed Post</CardTitle>
            <CardDescription>
              High-impact 1:1 or 4:5 visual infographic or quote post with an engaging long-form caption.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Creation Workspace Notice */}
      <Card className="p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-300 mx-auto flex items-center justify-center">
          <Sparkles className="w-7 h-7" />
        </div>
        <div className="max-w-md mx-auto space-y-2">
          <h3 className="text-lg font-bold text-foreground">Content Studio Workspace</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Ready to craft content for <strong>@lw_avee</strong>. Choose to generate an AI script or head over to the AI Caption Generator for instant hooks and viral copy.
          </p>
        </div>
        <div className="flex justify-center gap-3 pt-2">
          <Link href="/scripts">
            <Button variant="outline" size="sm" className="gap-2">
              Browse Existing Scripts <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/ai-caption-generator">
            <Button variant="gradient" size="sm" className="gap-2">
              Open AI Caption Generator
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
