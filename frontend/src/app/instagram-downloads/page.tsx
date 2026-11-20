"use client";

import { useEffect, useState } from "react";
import { Download, Copy, Instagram } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

const caption = "AI ka answer confident ho sakta hai—par fact tabhi jab proof ho. ✅ Original source kholo ✅ Doosre reliable source se cross-check ✅ Calculation/code ko test karo. Save this 3-check rule. #AI #AITips #LearnWithAvee #DigitalLiteracy #Hinglish";

export default function InstagramDownloadsPage() {
  const [message, setMessage] = useState("");
  const [workflowVideo, setWorkflowVideo] = useState<{ url: string; title: string; caption: string } | null>(null);

  useEffect(() => {
    const workflowId = new URLSearchParams(window.location.search).get("workflow");
    if (!workflowId) return;
    api.getCreatorWorkflow(workflowId).then(({ workflow }) => {
      if (workflow.status !== "completed" || !workflow.mediaAssetId?.url) throw new Error("This workflow has not finished generating a video yet.");
      setWorkflowVideo({
        url: workflow.mediaAssetId.url,
        title: workflow.scriptId?.reelTitle || workflow.topic,
        caption: [workflow.scriptId?.caption, workflow.scriptId?.cta, ...(workflow.scriptId?.hashtags || [])].filter(Boolean).join("\n\n"),
      });
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Could not load this generated Reel."));
  }, []);

  const captionToCopy = workflowVideo?.caption || caption;
  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(captionToCopy);
      setMessage("Instagram caption copied.");
    } catch {
      setMessage("Clipboard access was blocked. Select and copy the caption below.");
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      <div className="border-b border-border/80 pb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground"><Instagram className="h-8 w-8 text-pink-400" /> Instagram Downloads</h1>
        <p className="mt-2 text-sm text-muted-foreground">Download the ready-to-post vertical video and caption. This page does not publish to Instagram.</p>
      </div>
      {message && <p role="status" className="rounded-lg border border-border bg-secondary/50 p-3 text-sm">{message}</p>}
      {workflowVideo && <Card>
        <CardHeader>
          <CardTitle>{workflowVideo.title}</CardTitle>
          <CardDescription>Your generated AI-avatar Reel is saved here for review and manual posting.</CardDescription>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          <video controls preload="metadata" className="max-h-[65vh] w-auto max-w-full rounded-xl bg-black" src={workflowVideo.url} />
          <a className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500" href={workflowVideo.url} target="_blank" rel="noreferrer" download="learn-with-avee-reel.mp4"><Download className="mr-2 h-4 w-4" /> Download generated Reel</a>
          <div className="space-y-3 rounded-lg border border-border p-4">
            <h2 className="font-semibold">Instagram caption</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{workflowVideo.caption}</p>
            <Button type="button" variant="outline" onClick={copyCaption}><Copy className="mr-2 h-4 w-4" /> Copy caption</Button>
          </div>
        </div>
      </Card>}
      <Card>
        <CardHeader>
          <CardTitle>Sample Reel</CardTitle>
          <CardDescription>Example asset. New workflow videos appear above when you open this page from a completed workflow.</CardDescription>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          <video controls preload="metadata" className="max-h-[65vh] w-auto max-w-full rounded-xl bg-black" src="/content/ai-answer-check-short/instagram-reel.mp4" />
          <a className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500" href="/content/ai-answer-check-short/instagram-reel.mp4" download="learn-with-avee-ai-answer-check-reel.mp4"><Download className="mr-2 h-4 w-4" /> Download Reel</a>
          <div className="space-y-3 rounded-lg border border-border p-4">
            <h2 className="font-semibold">Instagram caption</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{caption}</p>
            <Button type="button" variant="outline" onClick={copyCaption}><Copy className="mr-2 h-4 w-4" /> Copy caption</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
