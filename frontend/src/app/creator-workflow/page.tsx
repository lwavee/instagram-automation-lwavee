"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clapperboard, Download, ExternalLink, LoaderCircle, Search, Sparkles, Youtube } from "lucide-react";
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
  errorMessage?: string;
  scriptId?: { reelTitle: string; openingHook: string; fullVoiceover: string; caption: string; hashtags: string[] };
  createdAt: string;
};

const busy = (status: Workflow["status"]) => !["completed", "failed"].includes(status);
const fmt = (value: number) => new Intl.NumberFormat("en-IN").format(value);

export default function CreatorWorkflowPage() {
  const [niche, setNiche] = useState("AI tools, software tutorials, cybersecurity, and web development for Indian students and creators");
  const [topic, setTopic] = useState("");
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [active, setActive] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await api.getCreatorWorkflows();
      const items: Workflow[] = data.workflows || [];
      setWorkflows(items);
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

  const start = async (event: React.FormEvent) => {
    event.preventDefault();
    const clipEstimate = 3 * 6;
    if (!window.confirm(`Start the automated workflow? Gemini video generation is paid. A 3-scene 720p draft is approximately $${(clipEstimate * 0.07).toFixed(2)} at the current published rate, plus text/input charges. Actual billing depends on generated duration and account pricing. The workflow will not publish to Instagram or YouTube.`)) return;
    setLoading(true);
    setMessage("Starting research and script generation…");
    try {
      const data = await api.startCreatorWorkflow({ idempotencyKey: crypto.randomUUID(), topic: topic.trim(), niche: niche.trim() });
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
      <p className="mt-2 max-w-4xl text-sm text-muted-foreground">Research recent videos in your niche, choose an original topic, create a Hinglish script and scene prompts, generate Gemini avatar clips, and assemble a vertical MP4. You decide where to publish it.</p>
    </header>

    {message && <div role="status" className="rounded-lg border border-border bg-secondary/50 p-3 text-sm">{message}</div>}

    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Start a workflow</CardTitle>
        <CardDescription>Public view counts and upload dates are used as signals, not promises of virality. Gemini generates 3–4 clips with a consistent fictional avatar and synthesized speech.</CardDescription>
      </CardHeader>
      <form onSubmit={start} className="space-y-4 px-6 pb-6">
        <label className="block space-y-2 text-sm"><span className="font-medium">Niche</span><input required maxLength={200} value={niche} onChange={(event) => setNiche(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" /></label>
        <label className="block space-y-2 text-sm"><span className="font-medium">Optional topic</span><input maxLength={160} value={topic} onChange={(event) => setTopic(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" placeholder="Leave blank to let Gemini choose from the research" /></label>
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100"><AlertTriangle className="mr-1 inline h-4 w-4" />Video generation is paid and billed by Google. Three 6-second 720p clips are about $1.26 at the current published rate, plus text/input charges. A fourth scene costs more. Backend needs <code>YOUTUBE_DATA_API_KEY</code>, a Gemini key, and persistent media storage for production.</div>
        <Button type="submit" disabled={loading || (active !== null && busy(active.status))}><Search className="mr-2 h-4 w-4" />{loading ? "Starting…" : "Research and create Short"}</Button>
      </form>
    </Card>

    {active && <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3"><span>{active.topic || "Creator workflow"}</span><span className="rounded-full border border-border px-3 py-1 text-xs font-medium capitalize">{active.status}</span></CardTitle>
          <CardDescription className="flex items-center gap-2">{busy(active.status) ? <LoaderCircle className="h-4 w-4 animate-spin" /> : active.status === "completed" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}{active.stageMessage}</CardDescription>
        </CardHeader>
        {active.errorMessage && <p className="px-6 pb-5 text-sm text-red-300">{active.errorMessage}</p>}
        {active.status === "completed" && active.mediaUrl && <div className="flex flex-wrap gap-3 px-6 pb-6">
          <a href={active.mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white"><Download className="mr-2 h-4 w-4" />Download / preview MP4</a>
          <Link href="/youtube" className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm"><Youtube className="mr-2 h-4 w-4" />YouTube Studio upload</Link>
          <Link href={`/instagram-downloads?workflow=${active._id}`} className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm">Instagram download tab <ExternalLink className="ml-2 h-4 w-4" /></Link>
        </div>}
      </Card>

      {active.research?.length > 0 && <Card><CardHeader><CardTitle>Recent niche video signals</CardTitle><CardDescription>Observed public titles, channel names, views, and views per hour over the last 90 days. This ranking does not predict results.</CardDescription></CardHeader>
        <div className="space-y-2 px-6 pb-6">{active.research.map((item) => <a key={item.videoId} href={item.url} target="_blank" rel="noreferrer" className="block rounded-lg border border-border p-3 hover:bg-secondary/50"><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.channelTitle} · {fmt(item.viewCount)} views · {fmt(item.viewsPerHour)} views/hour</p></a>)}</div></Card>}

      {active.topicRationale && <Card><CardHeader><CardTitle>Topic angle</CardTitle><CardDescription>{active.topicRationale}</CardDescription></CardHeader></Card>}
      {active.scriptId && <Card><CardHeader><CardTitle>{active.scriptId.reelTitle}</CardTitle><CardDescription>{active.scriptId.openingHook}</CardDescription></CardHeader><div className="space-y-3 px-6 pb-6"><h3 className="font-semibold">Script</h3><p className="whitespace-pre-wrap text-sm leading-7">{active.scriptId.fullVoiceover}</p><p className="text-sm text-muted-foreground">{active.scriptId.caption}</p><p className="text-xs text-brand-300">{active.scriptId.hashtags?.join(" ")}</p></div></Card>}
      {active.scenes?.length > 0 && <Card><CardHeader><CardTitle>Scene-by-scene generation prompts</CardTitle><CardDescription>These exact prompts were submitted to Gemini for clip generation.</CardDescription></CardHeader><div className="space-y-3 px-6 pb-6">{active.scenes.map((scene) => <details key={scene.sceneNumber} className="rounded-lg border border-border p-3"><summary className="cursor-pointer font-medium">Scene {scene.sceneNumber} · {scene.durationSeconds} seconds</summary><p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{scene.prompt}</p></details>)}</div></Card>}
      {active.clips?.length > 0 && <Card><CardHeader><CardTitle>Generated scene clips</CardTitle><CardDescription>Each successfully generated scene is saved before assembly so it remains recoverable if a later step fails.</CardDescription></CardHeader><div className="space-y-2 px-6 pb-6">{active.clips.map((clip) => <a key={clip.sceneNumber} className="block rounded-lg border border-border p-3 text-sm underline" href={clip.url} target="_blank" rel="noreferrer">Preview or download scene {clip.sceneNumber}</a>)}</div></Card>}
    </section>}

    {workflows.length > 1 && <Card><CardHeader><CardTitle>Previous workflows</CardTitle></CardHeader><div className="space-y-2 px-6 pb-6">{workflows.slice(0, 10).map((item) => <button key={item._id} onClick={() => void selectWorkflow(item._id)} className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left hover:bg-secondary/50"><span className="truncate pr-3">{item.topic || item.requestedTopic || item.niche}</span><span className="text-xs capitalize text-muted-foreground">{item.status}</span></button>)}</div></Card>}

    <p className="text-xs text-muted-foreground">YouTube connection stays separate. When ready, use <Link className="underline" href="/youtube">YouTube Studio</Link> to connect a channel and upload your downloaded MP4 privately. No content is published automatically.</p>
  </main>;
}
