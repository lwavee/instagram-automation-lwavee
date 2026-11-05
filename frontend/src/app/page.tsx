"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  TrendingUp,
  Calendar,
  Send,
  Eye,
  Heart,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatNumber, formatDate } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || "Could not load dashboard statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const kpi = stats?.kpi || {
    publishedPosts: 0,
    scheduledPosts: 0,
    draftPosts: 0,
    failedPosts: 0,
    totalReach: 0,
    totalImpressions: 0,
    engagementRate: 0,
    followersCount: 0,
    autoPublishEnabled: false,
  };

  const chartData = stats?.analyticsTrend?.length
    ? stats.analyticsTrend.map((s: any) => ({
        date: formatDate(s.snapshotDate).split(",")[0],
        reach: s.totalReach,
        impressions: s.totalImpressions,
      }))
    : [
        { date: "Day 1", reach: 1200, impressions: 2400 },
        { date: "Day 2", reach: 1800, impressions: 3600 },
        { date: "Day 3", reach: 2400, impressions: 4900 },
        { date: "Day 4", reach: 3100, impressions: 6200 },
        { date: "Day 5", reach: 4500, impressions: 8800 },
        { date: "Day 6", reach: 5900, impressions: 11400 },
        { date: "Today", reach: 7200, impressions: 14500 },
      ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            LWAVEE Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Instagram AI Automation & Publishing Engine • @lw_avee
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/content-studio">
            <Button variant="outline" size="sm" className="gap-2">
              <Sparkles className="w-4 h-4 text-brand-400" />
              Content Studio
            </Button>
          </Link>
          <Link href="/ai-caption-generator">
            <Button variant="gradient" size="sm" className="gap-2">
              <Play className="w-4 h-4" />
              AI Caption Generator
            </Button>
          </Link>
        </div>
      </div>

      {/* Safety Guardrail Notice if Auto-Publish is Disabled */}
      {!kpi.autoPublishEnabled && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-amber-300 block mb-0.5">
              Human-in-the-Loop Safe Mode Active
            </span>
            <span className="text-muted-foreground leading-relaxed">
              Auto-publishing is strictly disabled by default. All scheduled Reels will pause in review status for your explicit approval before publishing to Instagram. You can enable auto-publishing in{" "}
              <Link href="/settings" className="text-brand-300 underline font-medium">
                Settings
              </Link>
              .
            </span>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Published Posts */}
        <Card className="relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Published Posts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatNumber(kpi.publishedPosts)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Live on @learnwithavee
          </p>
        </Card>

        {/* KPI 2: Total Reach */}
        <Card className="relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Reach</span>
            <Eye className="w-4 h-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {formatNumber(kpi.totalReach)}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" /> Organic discovery
          </p>
        </Card>

        {/* KPI 3: Engagement Rate */}
        <Card className="relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Engagement</span>
            <Heart className="w-4 h-4 text-pink-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {kpi.engagementRate}%
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Likes + Saves + Shares
          </p>
        </Card>

        {/* KPI 4: Scheduled in Queue */}
        <Card className="relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Scheduled Queue</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {kpi.scheduledPosts}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {kpi.draftPosts} additional drafts in progress
          </p>
        </Card>
      </div>

      {/* Main Charts & Highlights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Area Chart (2 Cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Reach & Impressions Growth</CardTitle>
              <CardDescription>
                Audience retention trajectory for Learn With Avee Instagram Reels
              </CardDescription>
            </div>
            <Badge variant="outline">Last 7 Days</Badge>
          </CardHeader>
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d946ef" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d946ef" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#833ab4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#833ab4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  stroke="#52525b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#52525b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatNumber}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="impressions"
                  stroke="#833ab4"
                  fillOpacity={1}
                  fill="url(#colorImp)"
                  name="Impressions"
                />
                <Area
                  type="monotone"
                  dataKey="reach"
                  stroke="#d946ef"
                  fillOpacity={1}
                  fill="url(#colorReach)"
                  name="Reach"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* AI Content Pipeline Stats (1 Col) */}
        <Card>
          <CardHeader>
            <CardTitle>AI Content Engine</CardTitle>
            <CardDescription>Pipeline throughput & ideas</CardDescription>
          </CardHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 flex items-center justify-center font-bold text-xs">
                  AI
                </div>
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Research Ideas
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Discovered topics
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold text-foreground">
                {stats?.aiStats?.totalIdeas || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  OK
                </div>
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Approved Ideas
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Ready for scriptwriting
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold text-emerald-400">
                {stats?.aiStats?.approvedIdeas || 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs">
                  SC
                </div>
                <div>
                  <span className="text-xs font-semibold text-foreground block">
                    Hinglish Scripts
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Hook & scene ready
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold text-foreground">
                {stats?.aiStats?.totalScripts || 0}
              </span>
            </div>

            <div className="pt-2">
              <Link href="/scripts">
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5">
                  Open Script Studio <ArrowUpRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Two Column Section: Upcoming Posts & Recent Automation Executions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Scheduled Posts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Scheduled Posts</CardTitle>
              <CardDescription>Scheduled calendar queue</CardDescription>
            </div>
            <Link href="/calendar">
              <Button variant="ghost" size="sm" className="text-xs text-brand-400 gap-1">
                Calendar <ArrowUpRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <div className="divide-y divide-border/60">
            {stats?.upcomingScheduledPosts?.length > 0 ? (
              stats.upcomingScheduledPosts.map((post: any) => (
                <div key={post._id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground block truncate max-w-xs">
                      {post.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {formatDate(post.scheduledPublishTime)}
                    </span>
                  </div>
                  <Badge variant={post.isAutoPublish ? "success" : "warning"}>
                    {post.isAutoPublish ? "Auto Publish" : "Approval Gate"}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No upcoming scheduled posts. Create and schedule a script to see it here!
              </div>
            )}
          </div>
        </Card>

        {/* Recent Automation Executions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Automation Executions</CardTitle>
              <CardDescription>n8n & internal background workers</CardDescription>
            </div>
            <Link href="/automation">
              <Button variant="ghost" size="sm" className="text-xs text-brand-400 gap-1">
                Workflows <ArrowUpRight className="w-3 h-3" />
              </Button>
            </Link>
          </CardHeader>
          <div className="divide-y divide-border/60">
            {stats?.recentAutomationExecutions?.length > 0 ? (
              stats.recentAutomationExecutions.map((exec: any) => (
                <div key={exec._id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground block">
                      {exec.workflowName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Trigger: {exec.triggerType} • {formatDate(exec.startedAt)}
                    </span>
                  </div>
                  <Badge
                    variant={
                      exec.status === "completed"
                        ? "success"
                        : exec.status === "failed"
                        ? "destructive"
                        : "default"
                    }
                  >
                    {exec.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No automation runs yet. Click trigger in Workflows to run your first task!
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

