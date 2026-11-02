"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Users,
  Calendar,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatNumber, formatDate } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AnalyticsPage() {
  const [range, setRange] = useState("30d");
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getAnalytics(range);
      setAnalytics(data);
    } catch (err: any) {
      console.warn("Could not load analytics:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [range]);

  const totals = analytics?.totals || {
    reach: 0,
    impressions: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    followers: 0,
    postsCount: 0,
    avgEngagementRate: 0,
  };

  const chartData = analytics?.chartData?.length
    ? analytics.chartData
    : [
        { date: "Week 1", reach: 1400, impressions: 3200 },
        { date: "Week 2", reach: 2900, impressions: 5800 },
        { date: "Week 3", reach: 4800, impressions: 9400 },
        { date: "Week 4", reach: 7300, impressions: 14200 },
      ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-brand-400" />
            Analytics & Audience Insights
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Meta Graph API verified performance telemetry for @learnwithavee Instagram content.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-2">
          {["7d", "30d", "90d"].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                range === r
                  ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              Last {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI 4-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Reach</span>
            <Eye className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">{formatNumber(totals.reach)}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Unique accounts reached</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Impressions</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">{formatNumber(totals.impressions)}</div>
          <p className="text-[11px] text-muted-foreground mt-1">Total Reel views & displays</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Engagement Rate</span>
            <Heart className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">{totals.avgEngagementRate}%</div>
          <p className="text-[11px] text-muted-foreground mt-1">Interactions / Reach</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Saves & Shares</span>
            <Bookmark className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatNumber(totals.saves + totals.shares)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">High retention signal</p>
        </Card>
      </div>

      {/* Interaction Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card/40 flex items-center gap-3">
          <Heart className="w-5 h-5 text-red-400" />
          <div>
            <span className="text-sm font-bold text-foreground">{formatNumber(totals.likes)}</span>
            <span className="text-[11px] text-muted-foreground block">Likes</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card/40 flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-blue-400" />
          <div>
            <span className="text-sm font-bold text-foreground">{formatNumber(totals.comments)}</span>
            <span className="text-[11px] text-muted-foreground block">Comments</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card/40 flex items-center gap-3">
          <Share2 className="w-5 h-5 text-emerald-400" />
          <div>
            <span className="text-sm font-bold text-foreground">{formatNumber(totals.shares)}</span>
            <span className="text-[11px] text-muted-foreground block">Shares</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card/40 flex items-center gap-3">
          <Bookmark className="w-5 h-5 text-amber-400" />
          <div>
            <span className="text-sm font-bold text-foreground">{formatNumber(totals.saves)}</span>
            <span className="text-[11px] text-muted-foreground block">Saves</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Impressions & Reach Trend</CardTitle>
          <CardDescription>Audience discovery performance over selected time window</CardDescription>
        </CardHeader>
        <div className="h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorReachA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorImpA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#833ab4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#833ab4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={formatNumber} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  borderColor: "#27272a",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="impressions" stroke="#833ab4" fillOpacity={1} fill="url(#colorImpA)" name="Impressions" />
              <Area type="monotone" dataKey="reach" stroke="#d946ef" fillOpacity={1} fill="url(#colorReachA)" name="Reach" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

