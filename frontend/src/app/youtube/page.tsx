"use client";

import React, { useEffect, useState } from "react";
import { Youtube, Upload, LockKeyhole, ExternalLink, RefreshCw, Unplug, FileVideo2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type YouTubeAccount = {
  isConnected: boolean;
  channelId?: string;
  channelTitle?: string;
  tokenExpiresAt?: string;
};

type YouTubeUpload = {
  _id: string;
  title: string;
  videoId?: string;
  status: string;
  createdAt: string;
};

export default function YouTubePage() {
  const [account, setAccount] = useState<YouTubeAccount>({ isConnected: false });
  const [uploads, setUploads] = useState<YouTubeUpload[]>([]);
  const [title, setTitle] = useState("AI ke jawab ko 3 checks se verify karo #Shorts");
  const [description, setDescription] = useState("AI ka confident answer bhi galat ho sakta hai. Original source kholo, ek independent reliable source se cross-check karo, aur calculation/code ko safe tareeke se test karo. Save this simple 3-check rule.\n\nLearn with Avee — practical AI and tech learning in Hinglish.\n\nSource: OpenAI Help Center — Does ChatGPT tell the truth? https://help.openai.com/en/articles/8313428-does-chatgpt-tell-the-truth");
  const [madeForKids, setMadeForKids] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const [status, history] = await Promise.all([api.getYouTubeAccount(), api.getYouTubeUploads()]);
      setAccount(status);
      setUploads(history.uploads || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load YouTube status.");
    }
  };

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    if (params.has("youtube_connected")) setMessage("YouTube channel connected. Check the channel name before uploading.");
    if (params.has("youtube_error")) setMessage("YouTube connection did not finish. Check the Google OAuth setup and try again.");
    if (params.has("youtube_connected") || params.has("youtube_error")) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const connect = async () => {
    setLoading(true);
    setMessage("Opening Google authorization for YouTube upload and channel read access...");
    try {
      const result = await api.getYouTubeAuthUrl();
      if (!result.url) throw new Error("The backend did not return a Google authorization URL.");
      window.location.assign(result.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start YouTube authorization.");
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect this YouTube channel from the dashboard and revoke its saved authorization?")) return;
    setLoading(true);
    try {
      const result = await api.disconnectYouTube();
      setMessage(result.message);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not disconnect YouTube.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!account.isConnected || !video) return;
    if (!window.confirm("Upload this video to the connected YouTube channel as PRIVATE? It will not be public.")) return;
    const form = new FormData();
    form.set("title", title.trim());
    form.set("description", description);
    form.set("madeForKids", madeForKids);
    form.set("video", video);
    setLoading(true);
    setMessage("Uploading to YouTube as private...");
    try {
      const result = await api.uploadYouTubeVideo(form, crypto.randomUUID());
      setMessage(`Uploaded privately. Review it in YouTube Studio: ${result.videoUrl}`);
      setVideo(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "YouTube upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      <div className="border-b border-border/80 pb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
          <Youtube className="h-8 w-8 text-red-400" /> YouTube Studio
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Prepare Shorts from the content workflow and upload to your own channel. New uploads are private for review.</p>
      </div>

      {message && <div className="rounded-lg border border-border bg-secondary/50 p-3 text-sm text-foreground">{message}</div>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Youtube className="h-5 w-5 text-red-400" /> Channel connection</CardTitle>
          <CardDescription>Google OAuth requests only YouTube upload and read-only channel identity scopes. The channel refresh token stays encrypted on the backend.</CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {account.isConnected ? <>
              <p className="font-semibold text-foreground">{account.channelTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">Channel ID: {account.channelId}</p>
            </> : <p className="text-sm text-muted-foreground">No YouTube channel connected.</p>}
          </div>
          {account.isConnected ? <Button type="button" variant="outline" onClick={disconnect} disabled={loading}><Unplug className="mr-2 h-4 w-4" /> Disconnect</Button>
            : <Button type="button" onClick={connect} disabled={loading}><Youtube className="mr-2 h-4 w-4" /> Connect YouTube</Button>}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Upload a Short</CardTitle>
          <CardDescription>Uploads are private. Review the finished video, synthetic-content disclosure, and metadata in YouTube Studio before you publish it.</CardDescription>
        </CardHeader>
        <form onSubmit={submit} className="space-y-4 px-6 pb-6">
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Video title</span>
            <input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2" placeholder="AI ke jawab ko 3 checks se verify karo #Shorts" />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Description</span>
            <textarea maxLength={5000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2" placeholder="Add a concise summary and sources." />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Is this video made for kids?</span>
            <select required value={madeForKids} onChange={(event) => setMadeForKids(event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2">
              <option value="" disabled>Select the audience setting</option>
              <option value="true">Yes, it is made for kids</option>
              <option value="false">No, it is not made for kids</option>
            </select>
            <span className="block text-xs text-muted-foreground">Choose based on the video&apos;s intended audience, not just whether children might watch it.</span>
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">MP4 video (up to 100 MB)</span>
            <span className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-background px-3 py-4 text-muted-foreground">
              <FileVideo2 className="h-5 w-5" /> {video?.name || "Choose an MP4 file"}
              <input className="sr-only" type="file" accept="video/mp4,.mp4" onChange={(event) => setVideo(event.target.files?.[0] || null)} />
            </span>
          </label>
          <div className="flex items-center gap-2 text-xs text-amber-300"><LockKeyhole className="h-4 w-4" /> Upload defaults to private. Publishing publicly is a separate review in YouTube Studio.</div>
          <Button type="submit" disabled={loading || !account.isConnected || !video || !title.trim() || !madeForKids}><Upload className="mr-2 h-4 w-4" /> Upload privately</Button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" /> Recent uploads</CardTitle>
          <CardDescription>Previous upload attempts, with uncertain outcomes retained to prevent accidental duplicates.</CardDescription>
        </CardHeader>
        <div className="space-y-3 px-6 pb-6">
          {uploads.length === 0 ? <p className="text-sm text-muted-foreground">No upload history yet.</p> : uploads.map((item) => (
            <div key={item._id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()} · {item.status}</p></div>
              {item.videoId && <a className="flex items-center gap-1 text-sm text-brand-300 underline" href={`https://studio.youtube.com/video/${item.videoId}/edit`} target="_blank" rel="noreferrer">Review in Studio <ExternalLink className="h-3 w-3" /></a>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
