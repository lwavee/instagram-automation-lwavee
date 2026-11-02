"use client";

import React, { useState, useEffect } from "react";
import {
  Film,
  Play,
  Sparkles,
  Layers,
  Calendar,
  Send,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Volume2,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";

export default function ReelManagerPage() {
  const [scripts, setScripts] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [isAutoPublish, setIsAutoPublish] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [scriptsData, mediaData] = await Promise.all([
        api.getScripts(),
        api.getMedia("fileType=video"),
      ]);

      if (scriptsData?.scripts) {
        setScripts(scriptsData.scripts);
        if (scriptsData.scripts.length > 0) {
          setSelectedScript(scriptsData.scripts[0]);
        }
      }
      if (mediaData?.assets) {
        setMediaList(mediaData.assets);
        if (mediaData.assets.length > 0) {
          setSelectedMedia(mediaData.assets[0]);
        }
      }
    } catch (err: any) {
      console.warn("Could not load reel manager data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateReelPost = async () => {
    if (!selectedScript) return;
    try {
      setLoading(true);
      const mediaUrl = selectedMedia?.url || "https://res.cloudinary.com/demo/video/upload/sample.mp4";
      await api.createPostFromScript(selectedScript._id, {
        mediaUrl,
        scheduledPublishTime: scheduleTime ? new Date(scheduleTime).toISOString() : undefined,
        isAutoPublish,
      });

      setStatusMsg("Reel scheduled successfully in calendar!");
      setPublishModalOpen(false);
    } catch (err: any) {
      setStatusMsg(`Error creating reel post: ${err.message}`);
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
            <Film className="w-8 h-8 text-brand-400" />
            Reel Production & Assembly Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Synchronize AI Hinglish scripts with video assets, voiceovers, and on-screen overlays.
          </p>
        </div>

        <Button
          variant="gradient"
          size="sm"
          onClick={() => setPublishModalOpen(true)}
          disabled={!selectedScript}
          className="gap-2"
        >
          <Calendar className="w-4 h-4" />
          Schedule Assembled Reel
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

      {/* 2 Column Assembly Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Script & Video Selectors (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Script Selection */}
          <Card>
            <CardHeader>
              <CardTitle>1. Select Approved Script</CardTitle>
              <CardDescription>Choose the script to pair with video</CardDescription>
            </CardHeader>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {scripts.map((s) => (
                <button
                  key={s._id}
                  onClick={() => setSelectedScript(s)}
                  className={`w-full p-2.5 rounded-lg text-left transition-all flex items-center justify-between border ${
                    selectedScript?._id === s._id
                      ? "bg-brand-500/15 border-brand-500/30 text-brand-300"
                      : "bg-secondary/40 border-border/50 text-foreground hover:bg-secondary"
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="text-xs font-semibold block truncate">
                      {s.reelTitle}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {s.language} • ~{s.suggestedDurationSeconds}s
                    </span>
                  </div>
                  <Badge variant={s.status === "approved" ? "success" : "secondary"}>
                    {s.status}
                  </Badge>
                </button>
              ))}
            </div>
          </Card>

          {/* Video Asset Selection */}
          <Card>
            <CardHeader>
              <CardTitle>2. Select Video Asset</CardTitle>
              <CardDescription>Video clip from Media Library</CardDescription>
            </CardHeader>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {mediaList.map((m) => (
                <button
                  key={m._id}
                  onClick={() => setSelectedMedia(m)}
                  className={`w-full p-2.5 rounded-lg text-left transition-all flex items-center justify-between border ${
                    selectedMedia?._id === m._id
                      ? "bg-brand-500/15 border-brand-500/30 text-brand-300"
                      : "bg-secondary/40 border-border/50 text-foreground hover:bg-secondary"
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="text-xs font-semibold block truncate">
                      {m.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {(m.sizeBytes / (1024 * 1024)).toFixed(1)} MB • {m.storageProvider}
                    </span>
                  </div>
                  <Badge variant="outline">Video</Badge>
                </button>
              ))}

              {mediaList.length === 0 && (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No video assets yet. Upload video in Media Library.
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Col: Assembly Preview (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-brand-500/30 p-6">
            <div className="flex items-center justify-between border-b border-border/80 pb-4 mb-4">
              <div>
                <span className="text-[11px] font-bold text-brand-400 uppercase tracking-wider block">
                  Reel Production Simulator
                </span>
                <h3 className="text-base font-bold text-foreground">
                  {selectedScript?.reelTitle || "Select a script"}
                </h3>
              </div>
              <Badge variant="gradient">Instagram 9:16 Format</Badge>
            </div>

            {/* Mobile Reel Screen Mockup */}
            <div className="mx-auto max-w-[280px] h-[500px] rounded-3xl border-2 border-border/80 bg-zinc-950 p-3 shadow-2xl flex flex-col justify-between relative overflow-hidden">
              {/* Top Reel Info */}
              <div className="z-10 flex items-center justify-between text-[11px] text-white/80">
                <span className="font-semibold">Reels</span>
                <span className="font-mono text-[10px]">
                  {selectedScript?.suggestedDurationSeconds || 45}s
                </span>
              </div>

              {/* Center Dynamic Hook & Visual Simulation */}
              <div className="my-auto text-center space-y-2 z-10 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
                <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider block">
                  Opening 2s Hook:
                </span>
                <p className="text-xs font-bold text-white italic">
                  &quot;{selectedScript?.openingHook || "Hook text preview..."}&quot;
                </p>
              </div>

              {/* Bottom Reel Caption & Audio */}
              <div className="z-10 text-white space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <div className="w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]">
                    A
                  </div>
                  <span>learnwithavee</span>
                  <span className="text-[10px] text-brand-400 border border-brand-500/40 px-1 rounded">
                    Follow
                  </span>
                </div>
                <p className="text-[10px] text-white/90 line-clamp-2">
                  {selectedScript?.caption || "Caption preview..."}
                </p>
                <div className="flex items-center gap-1 text-[9px] text-white/60">
                  <Volume2 className="w-3 h-3" /> Original Audio • Learn With Avee
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Schedule Modal */}
      <Modal
        isOpen={publishModalOpen}
        onClose={() => setPublishModalOpen(false)}
        title="Schedule Reel for Publishing"
        description={selectedScript?.reelTitle}
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">
              Select Publish Date & Time (Asia/Kolkata):
            </label>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="p-3 rounded-lg bg-secondary/40 border border-border/60 flex items-start gap-3">
            <input
              type="checkbox"
              id="autoPublishCheck2"
              checked={isAutoPublish}
              onChange={(e) => setIsAutoPublish(e.target.checked)}
              className="mt-0.5 rounded text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="autoPublishCheck2" className="text-xs cursor-pointer">
              <span className="font-semibold text-foreground block">
                Enable Auto-Publish for this Reel
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Requires Auto-Publish to be active in Settings. Otherwise pauses in Human Review status.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border/80">
            <Button variant="outline" size="sm" onClick={() => setPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" size="sm" onClick={handleCreateReelPost} isLoading={loading}>
              Confirm & Schedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
