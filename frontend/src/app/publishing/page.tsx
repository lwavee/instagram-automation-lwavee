"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Instagram,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Trash2,
  ShieldAlert,
  ExternalLink,
  RefreshCw,
  Info,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function InstagramPublishingPage() {
  const [accountData, setAccountData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [selectedLogsPost, setSelectedLogsPost] = useState<any>(null);
  const [logsModalOpen, setLogsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accRes, postsRes] = await Promise.all([
        api.getInstagramAccount(),
        api.getPosts(),
      ]);

      setAccountData(accRes);
      if (postsRes?.posts) {
        setPosts(postsRes.posts);
      }
    } catch (err: any) {
      console.warn("Could not load publishing data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePublishNow = async (postId: string) => {
    try {
      setLoading(true);
      setStatusMsg("Publishing container to Instagram Graph API...");
      const res = await api.publishPostNow(postId);

      if (res?.result?.success) {
        setStatusMsg("Successfully published to Instagram!");
      } else {
        setStatusMsg(`Status: ${res?.result?.statusMessage || "Published"}`);
      }
      loadData();
    } catch (err: any) {
      setStatusMsg(`Publishing failed: ${err.message}`);
      loadData();
    } finally {
      setLoading(false);
    }
  };

  const isConnected = accountData?.isConnected;
  const account = accountData?.account;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Send className="w-8 h-8 text-brand-400" />
            Instagram Publishing Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Official Meta Graph API v21.0 container publishing with strict safety guardrails.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh Queue
        </Button>
      </div>

      {statusMsg && (
        <div className="p-3 text-xs rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-muted-foreground hover:text-foreground">
            ×
          </button>
        </div>
      )}

      {/* Account Status Card */}
      {isConnected && account ? (
        <Card className="border-pink-500/30 bg-gradient-to-r from-pink-500/10 via-brand-500/5 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-brand-600 via-pink-600 to-amber-500 p-0.5">
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center font-bold text-lg text-pink-400">
                  <Instagram className="w-7 h-7" />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-foreground">
                    @{account.username}
                  </h3>
                  <Badge variant="success">Connected</Badge>
                  <Badge variant="outline">{account.accountType}</Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                  <span>Followers: <strong>{account.followersCount}</strong></span>
                  <span>Media: <strong>{account.mediaCount}</strong></span>
                  <span>Synced: <strong>{formatDate(account.lastSyncedAt).split(",")[0]}</strong></span>
                </div>
              </div>
            </div>

            <Link href="/integrations">
              <Button variant="outline" size="sm" className="text-xs">
                Manage Account
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="border-amber-500/40 bg-amber-500/10 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-400 mt-1 shrink-0" />
              <div>
                <h3 className="font-bold text-sm text-amber-300">
                  Instagram Professional Account Not Connected
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                  To publish Reels and retrieve real audience insights, connect your Instagram Business or Creator account in API Integrations. Real publishing requires valid Meta API credentials.
                </p>
              </div>
            </div>
            <Link href="/integrations">
              <Button variant="gradient" size="sm">
                Connect Instagram Account
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Safety Guardrails Protocol Notice */}
      <div className="rounded-xl border border-border bg-secondary/30 p-4">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-2 mb-1">
          <ShieldAlert className="w-4 h-4 text-brand-400" />
          Meta API Publishing Protocol & Guardrails:
        </h4>
        <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
          <li>Never publishes automatically unless explicit Auto-Publish toggle is enabled.</li>
          <li>Uses Meta 2-step async container creation (`/media`) followed by status polling (`/media_publish`).</li>
          <li>No unofficial scraping or automated browser logins are ever used.</li>
        </ul>
      </div>

      {/* Publishing Queue Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Post Publishing Queue ({posts.length})</CardTitle>
            <CardDescription>Scheduled, approved, and recently published content</CardDescription>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/80 text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Post Title</th>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">Schedule</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Publish Mode</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {posts.map((post) => (
                <tr key={post._id} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4 max-w-xs truncate font-medium text-foreground">
                    {post.title}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="outline">{post.mediaType}</Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {formatDate(post.scheduledPublishTime || post.publishedAt)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        post.status === "published"
                          ? "success"
                          : post.status === "failed"
                          ? "destructive"
                          : post.status === "scheduled"
                          ? "default"
                          : "warning"
                      }
                    >
                      {post.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {post.isAutoPublish ? "Auto-Publish" : "Human Approval Gate"}
                  </td>
                  <td className="py-3 px-4 text-right space-x-2">
                    {post.publishingLogs?.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedLogsPost(post);
                          setLogsModalOpen(true);
                        }}
                        className="text-[11px] p-1.5 h-auto text-muted-foreground hover:text-foreground"
                      >
                        Logs
                      </Button>
                    )}

                    {post.status !== "published" && (
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => handlePublishNow(post._id)}
                        isLoading={loading}
                        className="text-[11px] p-1.5 h-auto px-2"
                      >
                        Publish Now
                      </Button>
                    )}

                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs text-brand-400 hover:underline gap-0.5"
                      >
                        Instagram <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}

              {posts.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    No posts currently in queue. Generate a script and schedule it to see it here!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Logs Modal */}
      <Modal
        isOpen={logsModalOpen}
        onClose={() => setLogsModalOpen(false)}
        title="Publishing Execution Logs"
        description={selectedLogsPost?.title}
      >
        <div className="space-y-2 max-h-72 overflow-y-auto font-mono text-[11px] p-3 rounded-lg bg-black/60 border border-border">
          {selectedLogsPost?.publishingLogs?.map((log: any, idx: number) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}:
              </span>
              <span
                className={
                  log.level === "error"
                    ? "text-red-400"
                    : log.level === "warn"
                    ? "text-amber-300"
                    : "text-emerald-400"
                }
              >
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

