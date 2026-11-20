"use client";

import { useState } from "react";
import { Download, Copy, Instagram } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const caption = "AI ka answer confident ho sakta hai—par fact tabhi jab proof ho. ✅ Original source kholo ✅ Doosre reliable source se cross-check ✅ Calculation/code ko test karo. Save this 3-check rule. #AI #AITips #LearnWithAvee #DigitalLiteracy #Hinglish";

export default function InstagramDownloadsPage() {
  const [message, setMessage] = useState("");

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
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
      <Card>
        <CardHeader>
          <CardTitle>AI answer check · Reel</CardTitle>
          <CardDescription>9:16 MP4, caption-led, 27 seconds. Review the final video before posting.</CardDescription>
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
