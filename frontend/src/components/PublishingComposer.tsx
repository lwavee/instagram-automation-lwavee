"use client";

import { type FormEvent, useRef, useState } from "react";
import { api } from "@/lib/api";
import { istToUtc } from "@/lib/schedule";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

type Format = "IMAGE" | "VIDEO" | "REELS" | "CAROUSEL" | "TEXT";
type Destination = "instagram" | "facebook";
type CarouselItem = { type: "IMAGE" | "VIDEO"; url: string };

const field = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
const formats: Record<Destination, Format[]> = {
  instagram: ["IMAGE", "CAROUSEL", "VIDEO", "REELS"],
  facebook: ["TEXT", "IMAGE"],
};
const formatName: Record<Format, string> = {
  IMAGE: "Photo", CAROUSEL: "Carousel", VIDEO: "Video published as Reel", REELS: "Reel", TEXT: "Text",
};
const defaultItems: CarouselItem[] = [{ type: "IMAGE", url: "" }, { type: "IMAGE", url: "" }];

export function PublishingComposer({ autoPublishEnabled, onSaved }: {
  autoPublishEnabled: boolean;
  onSaved: (message: string) => void;
}) {
  const [destination, setDestination] = useState<Destination>("instagram");
  const [format, setFormat] = useState<Format>("IMAGE");
  const [items, setItems] = useState(defaultItems);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<{ payload: string; key: string } | null>(null);

  const updateItem = (index: number, update: Partial<CarouselItem>) => {
    setItems((current) => current.map((item, at) => at === index ? { ...item, ...update } : item));
  };

  const savePost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const value = (name: string) => String(fields.get(name) || "").trim();
    setPending(true);
    setError("");
    try {
      const schedule = value("schedule");
      const data = {
        destination, mediaType: format, title: value("title"), caption: value("caption"),
        hashtags: value("hashtags").split(/[\s,]+/).filter(Boolean),
        mediaUrl: value("media"), coverImageUrl: value("cover"),
        mediaItems: format === "CAROUSEL" ? items.map((item) => ({ ...item, url: item.url.trim() })) : [],
        scheduledPublishTime: schedule ? istToUtc(schedule) : undefined,
        isAutoPublish: fields.get("autoPublish") === "on",
      };
      const payload = JSON.stringify(data);
      if (request.current?.payload !== payload) request.current = { payload, key: crypto.randomUUID() };
      const result = await api.createPost(data, request.current.key);
      request.current = null;
      form.reset();
      setItems(defaultItems);
      onSaved(result.post.status === "scheduled" ? "Post scheduled." : "Draft saved.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save the post.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Create a post</h2>
      <form className="mt-4 space-y-4" onSubmit={savePost}>
        <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
          <label>Destination
            <select className={field} value={destination} onChange={(event) => {
              const next = event.target.value as Destination;
              setDestination(next);
              setFormat(formats[next][0]);
            }}>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook Page</option>
            </select>
          </label>
          <label>Format
            <select className={field} value={format} onChange={(event) => setFormat(event.target.value as Format)}>
              {formats[destination].map((option) => <option key={option} value={option}>{formatName[option]}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">Title
            <input name="title" className={field} minLength={2} maxLength={200} required />
          </label>
          <label className="sm:col-span-2">{format === "TEXT" ? "Message" : "Caption"}
            <textarea name="caption" className={field} maxLength={2200} required={format === "TEXT"} rows={3} />
          </label>
          <label className="sm:col-span-2">Hashtags
            <input name="hashtags" className={field} placeholder="#technology #learnwithavee" />
          </label>
          {format !== "TEXT" && format !== "CAROUSEL" && (
            <label className="sm:col-span-2">Public HTTPS {format === "IMAGE" ? "image" : "video"} URL
              <input type="url" name="media" className={field} required />
            </label>
          )}
          {["VIDEO", "REELS"].includes(format) && (
            <label className="sm:col-span-2">Cover image URL (optional)
              <input type="url" name="cover" className={field} />
            </label>
          )}
          {format === "CAROUSEL" && (
            <div className="sm:col-span-2 space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[8rem,1fr,auto] sm:items-end">
                  <label>Item {index + 1}
                    <select className={field} value={item.type} onChange={(event) => updateItem(index, { type: event.target.value as CarouselItem["type"] })}>
                      <option value="IMAGE">Photo</option><option value="VIDEO">Video</option>
                    </select>
                  </label>
                  <label>Public HTTPS media URL
                    <input type="url" className={field} required value={item.url} onChange={(event) => updateItem(index, { url: event.target.value })} />
                  </label>
                  <Button type="button" variant="outline" disabled={items.length <= 2} onClick={() => setItems(items.filter((_, at) => at !== index))}>Remove</Button>
                </div>
              ))}
              <Button type="button" variant="outline" disabled={items.length >= 20} onClick={() => setItems([...items, { type: "IMAGE", url: "" }])}>Add carousel item</Button>
            </div>
          )}
          <label>Schedule in IST (optional)
            <input name="schedule" type="datetime-local" className={field} />
          </label>
          {autoPublishEnabled && (
            <label className="self-end py-2"><input type="checkbox" name="autoPublish" className="mr-2" />Auto-publish at the scheduled time</label>
          )}
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <Button variant="gradient" type="submit" isLoading={pending}>Save post</Button>
      </form>
    </Card>
  );
}

