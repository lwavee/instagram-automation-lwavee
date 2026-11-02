"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  ShieldAlert,
  Bell,
  Clock,
  Globe,
  Save,
  CheckCircle2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/authContext";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [autoPublishEnabled, setAutoPublishEnabled] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState<"hi-en" | "hi" | "en">("hi-en");
  const [defaultTimezone, setDefaultTimezone] = useState("Asia/Kolkata");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    if (user?.preferences) {
      setAutoPublishEnabled(user.preferences.autoPublishEnabled || false);
      setDefaultLanguage(user.preferences.defaultLanguage || "hi-en");
      setDefaultTimezone(user.preferences.defaultTimezone || "Asia/Kolkata");
    }
  }, [user]);

  const loadLogs = async () => {
    try {
      const [notifsData, logsData] = await Promise.all([
        api.getNotifications(),
        api.getActivityLogs(),
      ]);
      if (notifsData?.notifications) setNotifications(notifsData.notifications);
      if (logsData?.logs) setActivityLogs(logsData.logs);
    } catch (e) {
      // Silently continue
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.updatePreferences({
        autoPublishEnabled,
        defaultLanguage,
        defaultTimezone,
      });
      await refreshUser();
      setStatusMsg("Preferences updated successfully!");
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Settings className="w-8 h-8 text-brand-400" />
            Platform Settings & Guardrails
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure system safety guardrails, auto-publishing authorization, and brand defaults.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 text-xs rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>
      )}

      {/* Safety Authorization Card */}
      <Card className="border-amber-500/40 bg-amber-500/5 p-6">
        <div className="flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
          <div className="space-y-3 flex-1">
            <div>
              <h3 className="font-bold text-base text-foreground">
                Critical Safety Protocol: Auto-Publishing Authorization
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                By default, this system operates in <strong>Human-in-the-Loop Safe Mode</strong>. Scheduled Reels will never publish automatically without your explicit consent. Enabling this opt-in allows the backend automation engine to publish scheduled posts at their target time.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPublishEnabled}
                  onChange={(e) => setAutoPublishEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
              </label>
              <span className="text-xs font-semibold text-foreground">
                {autoPublishEnabled
                  ? "Auto-Publishing Enabled (Authorized)"
                  : "Auto-Publishing Disabled (Human Approval Enforced)"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Preferences Form */}
      <Card>
        <CardHeader>
          <CardTitle>Brand & Regional Defaults</CardTitle>
          <CardDescription>Default language, timezone, and brand configuration</CardDescription>
        </CardHeader>

        <form onSubmit={handleSavePreferences} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Default Script Language:
              </label>
              <select
                value={defaultLanguage}
                onChange={(e: any) => setDefaultLanguage(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="hi-en">Hinglish (Conversational Hindi + English tech terms)</option>
                <option value="hi">Hindi (Devanagari)</option>
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Content Scheduling Timezone:
              </label>
              <select
                value={defaultTimezone}
                onChange={(e) => setDefaultTimezone(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST • UTC+05:30)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <Button variant="gradient" size="sm" type="submit" isLoading={loading} className="gap-2">
              <Save className="w-4 h-4" /> Save Preferences
            </Button>
          </div>
        </form>
      </Card>

      {/* System Activity Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle>System Activity Audit Log</CardTitle>
          <CardDescription>Immutable record of publishing events, approvals, and API changes</CardDescription>
        </CardHeader>

        <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
          {activityLogs.map((log) => (
            <div key={log._id} className="py-2.5 px-3 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-foreground block">
                  {log.action}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  By {log.performedBy} • {formatDate(log.createdAt)}
                </span>
              </div>
              <Badge variant={log.status === "success" ? "success" : "destructive"}>
                {log.status}
              </Badge>
            </div>
          ))}

          {activityLogs.length === 0 && (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No activity logs recorded yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

