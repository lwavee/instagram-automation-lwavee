"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Play,
  RotateCcw,
  Check,
  X,
  Copy,
  Calendar,
  Send,
  Sliders,
  ChevronDown,
  Layers,
  Film,
  FileText,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";

export default function ScriptGeneratorPage() {
  const [topic, setTopic] = useState("Gemini 2.5 Coding Agents Secret Features");
  const [reelTitle, setReelTitle] = useState("");
  const [language, setLanguage] = useState<"Hinglish" | "Hindi" | "English">("Hinglish");
  const [duration, setDuration] = useState(45);
  const [aiProvider, setAiProvider] = useState<"gemini" | "openrouter">("gemini");
  const [customInstructions, setCustomInstructions] = useState("");
  const [activeScript, setActiveScript] = useState<any>(null);
  const [savedScripts, setSavedScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [postModalOpen, setPostModalOpen] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [isAutoPublish, setIsAutoPublish] = useState(false);

  const loadScripts = async () => {
    try {
      const data = await api.getScripts();
      if (data?.scripts) {
        setSavedScripts(data.scripts);
        if (!activeScript && data.scripts.length > 0) {
          setActiveScript(data.scripts[0]);
        }
      }
    } catch (err: any) {
      console.warn("Could not load scripts:", err.message);
    }
  };

  useEffect(() => {
    loadScripts();
  }, []);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setStatusMsg("Generating high-retention Hindi/Hinglish Reel script...");
      const res = await api.generateScript({
        topic,
        reelTitle: reelTitle || undefined,
        language,
        targetDurationSeconds: duration,
        customInstructions,
        provider: aiProvider,
        model: aiProvider === "gemini" ? "gemini-3.1-flash-lite" : "meta-llama/llama-3.3-70b-instruct",
      });

      if (res?.script) {
        setActiveScript(res.script);
        setSavedScripts([res.script, ...savedScripts]);
        setStatusMsg("Script generated successfully!");
      }
    } catch (err: any) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (status: "approved" | "rejected") => {
    if (!activeScript) return;
    try {
      const res = await api.updateScriptStatus(activeScript._id, { status });
      if (res?.script) {
        setActiveScript(res.script);
        setSavedScripts(savedScripts.map((s) => (s._id === res.script._id ? res.script : s)));
        setStatusMsg(`Script marked as ${status}!`);
      }
    } catch (err: any) {
      setStatusMsg(`Status update error: ${err.message}`);
    }
  };

  const handleCreatePost = async () => {
    if (!activeScript) return;
    try {
      setLoading(true);
      await api.createPostFromScript(activeScript._id, {
        scheduledPublishTime: scheduleTime ? new Date(scheduleTime).toISOString() : undefined,
        isAutoPublish,
      });
      setPostModalOpen(false);
      setStatusMsg(scheduleTime ? "Post scheduled to Content Calendar!" : "Draft post created!");
      loadScripts();
    } catch (err: any) {
      setStatusMsg(`Error creating post: ${err.message}`);
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
            <Sparkles className="w-8 h-8 text-brand-400" />
            AI Script Generator Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Engineered for high audience retention, curiosity-driven 2-second hooks, and conversational Hindi/Hinglish.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div className="p-3 text-xs rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg("")} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Studio: Generator Form (Left) & Live Script Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Prompt & Controls (4 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Script Configuration</CardTitle>
              <CardDescription>Tailor the viral hook, language & duration</CardDescription>
            </CardHeader>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Topic / Angle:
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. 3 Insane ChatGPT Prompts for Coding"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Reel Title (Optional):
                </label>
                <input
                  type="text"
                  value={reelTitle}
                  onChange={(e) => setReelTitle(e.target.value)}
                  placeholder="Leave empty for AI suggested title"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  AI Engine:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAiProvider("gemini")}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all ${
                      aiProvider === "gemini"
                        ? "border-brand-500 bg-brand-500/10 text-brand-300 font-semibold shadow-sm"
                        : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                    }`}
                  >
                    Google Gemini
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiProvider("openrouter")}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-center transition-all ${
                      aiProvider === "openrouter"
                        ? "border-brand-500 bg-brand-500/10 text-brand-300 font-semibold shadow-sm"
                        : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
                    }`}
                  >
                    OpenRouter AI
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Language:
                  </label>
                  <select
                    value={language}
                    onChange={(e: any) => setLanguage(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="Hinglish">Hinglish (Recommended)</option>
                    <option value="Hindi">Hindi (Pure Devanagari)</option>
                    <option value="English">English</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Duration (Sec):
                  </label>
                  <select
                    value={duration}
                    onChange={(e: any) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value={30}>30s (Ultra Crisp)</option>
                    <option value={45}>45s (Optimal Retention)</option>
                    <option value={60}>60s (In-depth Tutorial)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Custom Instructions:
                </label>
                <textarea
                  rows={3}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Emphasize that this tool is 100% free and mention PDF download..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary/50 border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <Button
                variant="gradient"
                size="md"
                onClick={handleGenerate}
                isLoading={loading}
                className="w-full gap-2 shadow-lg shadow-brand-500/20"
              >
                <Sparkles className="w-4 h-4" />
                Generate Script
              </Button>
            </div>
          </Card>

          {/* Saved Scripts Quick Switcher */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Generated Scripts</CardTitle>
              <CardDescription>Click to load into editor</CardDescription>
            </CardHeader>
            <div className="divide-y divide-border/60 max-h-64 overflow-y-auto">
              {savedScripts.map((s) => (
                <button
                  key={s._id}
                  onClick={() => setActiveScript(s)}
                  className={`w-full py-2.5 px-2 text-left transition-colors flex items-center justify-between rounded-md ${
                    activeScript?._id === s._id ? "bg-secondary" : "hover:bg-secondary/40"
                  }`}
                >
                  <div className="truncate pr-2">
                    <span className="text-xs font-semibold text-foreground block truncate">
                      {s.reelTitle}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {s.topic} • {formatDate(s.createdAt)}
                    </span>
                  </div>
                  <Badge variant={s.status === "approved" ? "success" : "secondary"}>
                    {s.status}
                  </Badge>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Col: Live Script Breakdown & Actions (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {activeScript ? (
            <Card className="border-brand-500/30">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={activeScript.status === "approved" ? "success" : "warning"}>
                      Status: {activeScript.status}
                    </Badge>
                    <Badge variant="outline">{activeScript.language}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> ~{activeScript.suggestedDurationSeconds}s
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    {activeScript.reelTitle}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusUpdate("approved")}
                    className="text-xs gap-1 text-emerald-400 hover:text-emerald-300"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="gradient"
                    onClick={() => setPostModalOpen(true)}
                    className="text-xs gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Schedule Reel
                  </Button>
                </div>
              </div>

              {/* 2-Second Hook Highlight */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-transparent border border-pink-500/30 mb-6">
                <span className="text-[11px] font-bold text-pink-400 uppercase tracking-wider block mb-1">
                  ⚡ 2-Second Thumb-Stopping Hook:
                </span>
                <p className="text-sm font-semibold text-foreground italic">
                  &quot;{activeScript.openingHook}&quot;
                </p>
              </div>

              {/* Scene-by-Scene Timeline */}
              <div className="space-y-4 mb-6">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-brand-400" />
                  Scene-by-Scene Visual & Voiceover Breakdown:
                </h3>

                <div className="space-y-3">
                  {activeScript.scenes?.map((scene: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-border/70 bg-secondary/30 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-brand-400">
                          Scene {scene.sceneNumber} ({scene.durationSeconds}s)
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border/50">
                          Visual: {scene.visualDescription}
                        </span>
                      </div>

                      {scene.onScreenText && (
                        <div className="text-xs text-amber-300 font-medium">
                          <strong>On-Screen Text:</strong> &quot;{scene.onScreenText}&quot;
                        </div>
                      )}

                      <div className="text-xs text-foreground bg-card/60 p-2.5 rounded-md border border-border/40">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                          Voiceover (Hinglish/Hindi):
                        </span>
                        {scene.voiceoverHinglish || scene.voiceoverHindi}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Voiceover */}
              <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 mb-6 space-y-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                  Complete Narration (Voiceover):
                </span>
                <p className="text-xs text-foreground leading-relaxed">
                  {activeScript.fullVoiceover}
                </p>
              </div>

              {/* Caption, Hashtags & CTA */}
              <div className="space-y-3 p-4 rounded-xl bg-secondary/20 border border-border/40">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Instagram Caption:
                  </span>
                  <p className="text-xs text-foreground whitespace-pre-line bg-card/50 p-3 rounded-lg border border-border/50">
                    {activeScript.caption}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Call To Action (CTA):
                  </span>
                  <span className="text-xs font-semibold text-brand-300">
                    {activeScript.cta}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Viral Hashtags:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeScript.hashtags?.map((tag: string) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[11px] bg-secondary text-brand-300 border border-border/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="py-24 text-center">
              <Film className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-semibold text-sm text-foreground">No Script Loaded</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Fill in the topic on the left and click &quot;Generate Script&quot; to produce high-retention Hindi/Hinglish Reel scripts.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Schedule Post Modal */}
      <Modal
        isOpen={postModalOpen}
        onClose={() => setPostModalOpen(false)}
        title="Schedule Instagram Reel Post"
        description="Convert this script into a scheduled post on Learn With Avee Instagram"
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
              id="autoPublishCheck"
              checked={isAutoPublish}
              onChange={(e) => setIsAutoPublish(e.target.checked)}
              className="mt-0.5 rounded text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="autoPublishCheck" className="text-xs cursor-pointer">
              <span className="font-semibold text-foreground block">
                Allow Auto-Publishing for this Reel
              </span>
              <span className="text-[11px] text-muted-foreground block mt-0.5">
                Requires Auto-Publish to be enabled in Settings. Otherwise pauses in Review status.
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" size="sm" onClick={() => setPostModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gradient" size="sm" onClick={handleCreatePost} isLoading={loading}>
              Confirm Schedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

