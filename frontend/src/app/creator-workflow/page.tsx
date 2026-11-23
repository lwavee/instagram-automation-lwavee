"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, CheckCircle2, Clapperboard, Copy, Download, ExternalLink, Image as ImageIcon, LoaderCircle, RotateCcw, Search, Sparkles, Volume2, Youtube } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

type Workflow = {
  _id: string;
  status: "queued" | "researching" | "scripting" | "generating" | "assembling" | "completed" | "failed";
  stageMessage: string;
  niche: string;
  requestedTopic: string;
  topic: string;
  topicRationale: string;
  research: Array<{ videoId: string; title: string; channelTitle: string; viewCount: number; viewsPerHour: number; url: string }>;
  scenes: Array<{ sceneNumber: number; prompt: string; durationSeconds: number }>;
  clips: Array<{ sceneNumber: number; url: string }>;
  mediaUrl?: string;
  coverImageUrl?: string;
  errorMessage?: string;
  scriptId?: { reelTitle: string; openingHook: string; fullVoiceover: string; caption: string; hashtags: string[] };
  createdAt: string;
};

const busy = (status: Workflow["status"]) => !["completed", "failed"].includes(status);
const fmt = (value: number) => new Intl.NumberFormat("en-IN").format(value);

export default function CreatorWorkflowPage() {
  const [niche, setNiche] = useState("AI tools, software tutorials, cybersecurity, and web development for Indian students and creators");
  const [topic, setTopic] = useState("");
  const [videoStyle, setVideoStyle] = useState("motion-graphics");
  const [voiceId, setVoiceId] = useState("hi-IN-MadhurNeural");
  const [voices, setVoices] = useState<Array<{ id: string; name: string; gender: string; language?: string }>>([
    { id: "hi-IN-MadhurNeural", name: "Madhur (Natural Indian Male Educator — Recommended)", gender: "Male", language: "Hindi/Hinglish" },
    { id: "hi-IN-SwaraNeural", name: "Swara (Natural Indian Female Educator)", gender: "Female", language: "Hindi/Hinglish" },
    { id: "en-IN-PrabhatNeural", name: "Prabhat (Indian Male Tech English)", gender: "Male", language: "Indian English" },
    { id: "en-IN-NeerjaNeural", name: "Neerja (Indian Female Tech English)", gender: "Female", language: "Indian English" },
  ]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [active, setActive] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [readiness, setReadiness] = useState<{ ready: boolean; missing: string[] } | null>(null);

  const copyCaption = (captionText: string, tags: string[] = []) => {
    const full = `${captionText}\n\n${tags.join(" ")}`;
    void navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const load = useCallback(async () => {
    try {
      const [data, status, voiceData] = await Promise.all([
        api.getCreatorWorkflows(),
        api.getCreatorWorkflowReadiness(),
        api.getCreatorWorkflowVoices().catch(() => null),
      ]);
      const items: Workflow[] = data.workflows || [];
      setReadiness(status as { ready: boolean; missing: string[] });
      setWorkflows(items);
      if (voiceData?.voices?.length) {
        setVoices(voiceData.voices);
      }
      setActive((current) => {
        if (current) return items.find((item) => item._id === current._id) || current;
        return items.find((item) => busy(item.status)) || items[0] || null;
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load creator workflow history.");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeId = active?._id;
  const activeStatus = active?.status;

  useEffect(() => {
    if (!activeId || !activeStatus || !busy(activeStatus)) return;
    const timer = window.setInterval(async () => {
      try {
        const data = await api.getCreatorWorkflow(activeId);
        const updated = data.workflow as Workflow;
        setActive(updated);
        setWorkflows((items) => items.map((item) => item._id === updated._id ? updated : item));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not check workflow progress.");
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [activeId, activeStatus]);

  const start = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!readiness?.ready) return;
    setLoading(true);
    setMessage("Starting research, neural voiceover, and motion graphics generation…");
    try {
      const data = await api.startCreatorWorkflow({
        idempotencyKey: crypto.randomUUID(),
        topic: topic.trim(),
        niche: niche.trim(),
        voiceId,
        videoStyle,
      });
      const workflow = data.workflow as Workflow;
      setActive(workflow);
      setWorkflows((items) => [workflow, ...items.filter((item) => item._id !== workflow._id)]);
      setMessage("Workflow started. This page will update as each stage completes.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start the creator workflow.");
    } finally {
      setLoading(false);
    }
  };

  const selectWorkflow = async (id: string) => {
    try {
      const data = await api.getCreatorWorkflow(id);
      setActive(data.workflow as Workflow);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open this workflow.");
    }
  };

  return <main className="space-y-6 pb-10">
    <header className="border-b border-border/80 pb-5">
      <h1 className="flex items-center gap-3 text-3xl font-bold"><Clapperboard className="h-8 w-8 text-brand-400" /> Automated Short Creator</h1>
      <p className="mt-2 max-w-4xl text-sm text-muted-foreground">Research recent videos in your niche, choose an original topic, create a Hinglish script and scene prompts, and assemble ready-to-use short video assets.</p>
    </header>

    {message && <div role="status" className="rounded-lg border border-border bg-secondary/50 p-3 text-sm">{message}</div>}

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Start a workflow</CardTitle>
        <CardDescription>Researches trending niche signals to craft high-retention Hinglish scripts, hooks, and scene prompts tailored for Indian tech audiences.</CardDescription>
      </CardHeader>
      <form onSubmit={start} className="space-y-4 px-6 pb-6">
        <label className="block space-y-2 text-sm"><span className="font-medium">Niche</span><input required maxLength={200} value={niche} onChange={(event) => setNiche(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        <label className="block space-y-2 text-sm"><span className="font-medium">Optional topic</span><input maxLength={160} value={topic} onChange={(event) => setTopic(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" placeholder="Leave blank to let AI choose from trending research" /></label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <label className="block space-y-2 text-sm">
            <span className="font-medium flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-brand-400" /> Video Animation Style</span>
            <select
              value={videoStyle}
              onChange={(e) => setVideoStyle(e.target.value as "motion-graphics" | "ai-avatar")}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="motion-graphics">✨ Premium 2D/2.5D Motion Graphics (Vector &amp; Device Mockups — Fast, $0 Free)</option>
              <option value="ai-avatar">🤖 Gemini 3D AI Video (Requires Paid Google Cloud AI Credits)</option>
            </select>
            <p className="text-xs text-muted-foreground">Motion Graphics uses device mockups, spring animations, dynamic island, and zero-cost high-retention visual storytelling.</p>
          </label>

          <label className="block space-y-2 text-sm">
            <span className="font-medium flex items-center gap-1.5"><Volume2 className="h-4 w-4 text-brand-400" /> Hindi / Hinglish Neural Voiceover</span>
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.gender}{v.language ? `, ${v.language}` : ""})
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Natural Indian creator intonation with Hindi-English phonetic mapping for tech terms.</p>
          </label>
        </div>

        <div role="status" className={`rounded-lg border p-3 text-xs ${readiness?.ready ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100" : "border-amber-500/40 bg-amber-500/10 text-amber-100"}`}>
          {readiness?.ready ? <CheckCircle2 className="mr-1 inline h-4 w-4" /> : <AlertTriangle className="mr-1 inline h-4 w-4" />}
          {readiness === null ? "Checking backend requirements…" : readiness.ready ? "Required services are configured. Generated content is saved for you; nothing is published automatically." : <>Workflow unavailable until the backend is configured: <ul className="mt-2 list-disc space-y-1 pl-6">{readiness.missing.map((item) => <li key={item}>{item}</li>)}</ul></>}
        </div>
        <div className="rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground"><Sparkles className="mr-1 inline h-4 w-4 text-brand-400" />Premium Content Engine: Analyzes YouTube niche trends, scripts high-retention hooks in Hinglish, and generates ready-to-use 9:16 scene prompts.</div>
        <Button type="submit" disabled={loading || !readiness?.ready || (active !== null && busy(active.status))}><Search className="mr-2 h-4 w-4" />{loading ? "Starting…" : "Research and create Short"}</Button>
      </form>
    </Card>

    {active && <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3"><span>{active.topic || "Creator workflow"}</span><span className="rounded-full border border-border px-3 py-1 text-xs font-medium capitalize">{active.status}</span></CardTitle>
          <CardDescription className="flex items-center gap-2">{busy(active.status) ? <LoaderCircle className="h-4 w-4 animate-spin" /> : active.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}{active.stageMessage}</CardDescription>
        </CardHeader>
        {active.errorMessage && <div className="mx-6 mb-5 rounded-lg border border-red-500/30 bg-red-950/20 p-4 space-y-3">
          <p className="font-mono text-xs text-red-300 break-words">{active.errorMessage}</p>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-red-500/20">
            <p className="text-xs text-muted-foreground">This failure was recorded in a past run. The Linux video engine has been updated.</p>
            <Button size="sm" variant="secondary" onClick={() => void start()} disabled={loading || !readiness?.ready}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Start New Video
            </Button>
          </div>
        </div>}
        {active.status === "completed" && (
          <div className="space-y-4 px-6 pb-6">
            <div className="flex flex-wrap gap-3">
              {active.mediaUrl && (
                <a href={active.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500">
                  <Download className="mr-2 h-4 w-4" /> Download / preview MP4
                </a>
              )}
              {active.coverImageUrl && (
                <a href={active.coverImageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                  <ImageIcon className="mr-2 h-4 w-4" /> Download Cover Image
                </a>
              )}
              <Link href="/youtube" className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                <Youtube className="mr-2 h-4 w-4" /> YouTube Studio upload
              </Link>
              <Link href={`/instagram-downloads?workflow=${active._id}`} className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                Instagram download tab <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </div>

            {active.coverImageUrl && (
              <div className="mt-2 flex flex-col sm:flex-row items-center gap-5 rounded-lg border border-border bg-secondary/20 p-4">
                <img src={active.coverImageUrl} alt="Short Cover Thumbnail" className="w-28 h-48 object-cover rounded-md border border-border/80 shadow" />
                <div className="space-y-1.5 text-sm">
                  <span className="rounded-full bg-brand-500/20 text-brand-300 px-2.5 py-0.5 text-xs font-semibold">9:16 COVER THUMBNAIL</span>
                  <p className="font-semibold text-base">High-CTR Vertical Cover Ready</p>
                  <p className="text-muted-foreground text-xs max-w-lg leading-relaxed">Generated with bold high-contrast text, analogy hook badges, and channel branding for maximum click-through rate on Instagram Reels and YouTube Shorts.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {active.research?.length > 0 && <Card><CardHeader><CardTitle>Recent niche video signals</CardTitle><CardDescription>Observed public titles, channel names, views, and views per hour over the last 90 days. This ranking does not predict results.</CardDescription></CardHeader>
        <div className="space-y-2 px-6 pb-6">{active.research.map((item) => <a key={item.videoId} href={item.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-border p-3 hover:bg-secondary/50"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.channelTitle} · {fmt(item.viewCount)} views · {fmt(item.viewsPerHour)} views/hour</p></a>)}</div></Card>}

      {active.topicRationale && <Card><CardHeader><CardTitle>Topic angle</CardTitle><CardDescription>{active.topicRationale}</CardDescription></CardHeader></Card>}
      {active.scriptId && <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{active.scriptId.reelTitle}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => copyCaption(active.scriptId?.caption || "", active.scriptId?.hashtags || [])}>
              {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy Caption & Tags"}
            </Button>
          </div>
          <CardDescription>{active.scriptId.openingHook}</CardDescription>
        </CardHeader>
        <div className="space-y-3 px-6 pb-6">
          <h3 className="font-semibold text-sm">Hindi / Hinglish Voiceover Script</h3>
          <p className="whitespace-pre-wrap text-sm leading-7 rounded-md bg-secondary/30 p-3 border border-border/50">{active.scriptId.fullVoiceover}</p>
          <h3 className="font-semibold text-sm pt-2">Instagram Caption</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-secondary/30 p-3 border border-border/50">{active.scriptId.caption}</p>
          <p className="text-xs text-brand-300 font-mono">{active.scriptId.hashtags?.join(" ")}</p>
        </div>
      </Card>}
      {active.scenes?.length > 0 && <Card><CardHeader><CardTitle>Scene-by-scene generation prompts</CardTitle><CardDescription>These exact prompts were submitted to Gemini for clip generation.</CardDescription></CardHeader><div className="space-y-3 px-6 pb-6">{active.scenes.map((scene) => <details key={scene.sceneNumber} className="rounded-lg border border-border p-3"><summary className="cursor-pointer font-medium">Scene {scene.sceneNumber} · {scene.durationSeconds} seconds</summary><p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{scene.prompt}</p></details>)}</div></Card>}
      {active.clips?.length > 0 && <Card><CardHeader><CardTitle>Generated scene clips</CardTitle><CardDescription>Each successfully generated scene is saved before assembly so it remains recoverable if a later step fails.</CardDescription></CardHeader><div className="space-y-2 px-6 pb-6">{active.clips.map((clip) => <a key={clip.sceneNumber} className="block rounded-lg border border-border p-3 text-sm underline" href={clip.url} target="_blank" rel="noreferrer">Preview or download scene {clip.sceneNumber}</a>)}</div></Card>}
    </section>}

    {workflows.length > 1 && <Card><CardHeader><CardTitle>Previous workflows</CardTitle></CardHeader><div className="space-y-2 px-6 pb-6">{workflows.slice(0, 10).map((item) => <button key={item._id} onClick={() => void selectWorkflow(item._id)} className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-secondary/50"><span className="truncate pr-3">{item.topic || item.requestedTopic || item.niche}</span><span className="text-xs capitalize text-muted-foreground">{item.status}</span></button>)}</div></Card>}

    <p className="text-xs text-muted-foreground">YouTube connection stays separate. When ready, use <Link className="underline" href="/youtube">YouTube Studio</Link> to connect a channel and upload your downloaded MP4 privately. No content is published automatically.</p>
  </main>;
}
