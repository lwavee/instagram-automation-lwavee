"use client";

import React, { useState } from "react";
import { Activity, Terminal, CheckCircle2, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function AutomationLogsPage() {
  const [logs, setLogs] = useState([
    {
      id: "log-1",
      timestamp: new Date().toISOString(),
      action: "SCHEDULER_CYCLE",
      source: "GitHub Actions (.github/workflows/instagram-scheduler.yml)",
      status: "SUCCESS",
      details: "Cloud scheduler verified zero due posts. Queue healthy.",
    },
    {
      id: "log-2",
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      action: "INSTAGRAM_ACCOUNT_SYNC",
      source: "Backend Meta Service",
      status: "SUCCESS",
      details: "Verified long-lived access token validity for @lw_avee.",
    },
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Activity className="w-7 h-7 text-brand-400" />
            Automation Logs & Cloud Scheduler Audit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time execution log of GitHub Actions 15-min cron runs, container statuses, and publishing events.
          </p>
        </div>
        <div>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh Logs
          </Button>
        </div>
      </div>

      {/* Terminal View */}
      <Card className="p-0 overflow-hidden border-border bg-black/60 font-mono text-xs">
        <div className="px-4 py-3 bg-secondary/30 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Terminal className="w-4 h-4 text-brand-400" />
            <span>Execution Audit Stream</span>
          </div>
          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
            SYSTEM ONLINE
          </Badge>
        </div>
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="p-3 rounded-lg bg-secondary/20 border border-border/40 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-brand-300 font-bold">{log.action}</span>
                <span className="text-[10px]">{log.timestamp}</span>
              </div>
              <p className="text-foreground">{log.details}</p>
              <span className="text-[10px] text-muted-foreground/70 block">Source: {log.source}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
