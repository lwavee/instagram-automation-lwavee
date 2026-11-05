"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Clock, Calendar, CheckCircle2, AlertTriangle, ArrowRight, Eye, Film, Image as ImageIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function ScheduledPostsPage() {
  const [filter, setFilter] = useState<"ALL" | "SCHEDULED" | "APPROVED" | "PENDING_APPROVAL">("ALL");

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Clock className="w-7 h-7 text-brand-400" />
            Scheduled Posts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review, re-order, and manage all upcoming scheduled Instagram content for @lw_avee
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/calendar">
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="w-4 h-4" />
              Calendar View
            </Button>
          </Link>
          <Link href="/content-studio">
            <Button variant="gradient" size="sm" className="gap-2">
              Schedule New Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {(["ALL", "SCHEDULED", "APPROVED", "PENDING_APPROVAL"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === tab
                ? "bg-brand-500/20 text-brand-300 border border-brand-500/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Scheduled Queue Cards */}
      <div className="space-y-4">
        <Card className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center shrink-0">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20">
                  REEL
                </Badge>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  APPROVED
                </Badge>
                <span className="text-xs text-muted-foreground">Today at 18:30 IST</span>
              </div>
              <h4 className="text-sm font-semibold text-foreground mt-1">
                Top 5 Hidden AI Tools You Need in 2026
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                🚨 5 AI Tools that feel ILLEGAL to know in 2026! If you are still doing everything manually...
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/publishing-queue">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <Eye className="w-3.5 h-3.5" /> View in Queue
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
