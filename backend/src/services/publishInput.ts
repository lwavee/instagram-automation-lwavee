import { isIP } from "net";
import { z } from "zod";
import { MetaError } from "./metaGraph";

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i);
export const publishTime = z.string().datetime({ offset: true }).refine((value) => Number.isFinite(Date.parse(value)));
export const mediaTypes = ["IMAGE", "VIDEO", "REELS", "CAROUSEL", "TEXT"] as const;

const publicUrl = z.string().max(2048).url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port &&
      url.hostname.includes(".") && !isIP(url.hostname.replace(/\.$/, "")) && !/\.(localhost|local|internal)\.?$/i.test(url.hostname);
  } catch { return false; }
}, "Use a public HTTPS media URL without credentials.");

const item = z.object({ type: z.enum(["IMAGE", "VIDEO"]), url: publicUrl });

export const publishInput = z.object({
  destination: z.enum(["instagram", "facebook"]).default("instagram"),
  mediaType: z.enum(mediaTypes).default("REELS"),
  caption: z.string().trim().max(2200).default(""),
  hashtags: z.array(z.string().trim().regex(/^#?[\p{L}\p{M}\p{N}_]+$/u).max(100)).max(30).default([]),
  mediaUrl: z.union([publicUrl, z.literal("")]).default(""),
  coverImageUrl: z.union([publicUrl, z.literal("")]).default(""),
  mediaItems: z.array(item).max(20).default([]),
});

export function validateMedia(input: z.infer<typeof publishInput>) {
  if (input.destination === "facebook" && !["TEXT", "IMAGE"].includes(input.mediaType)) {
    return "Facebook Page publishing supports text and photos in this dashboard.";
  }
  if (input.mediaType === "TEXT") {
    if (input.destination !== "facebook" || !input.caption) return "Text posts require a Facebook Page destination and a message.";
    if (input.mediaUrl) return "Text posts do not accept a media URL.";
  } else if (input.mediaType === "CAROUSEL") {
    if (input.mediaItems.length < 2 || input.mediaUrl) return "Enter between 2 and 20 carousel items.";
  } else if (!input.mediaUrl) {
    return "A public HTTPS media URL is required.";
  }
  if (input.mediaType !== "CAROUSEL" && input.mediaItems.length) return "Carousel items require the carousel format.";
  if (input.coverImageUrl && !["VIDEO", "REELS"].includes(input.mediaType)) return "A cover requires an Instagram video or Reel.";

  const caption = publishCaption(input.caption, input.hashtags);
  if (caption.length > 2200 || (caption.match(/#[\p{L}\p{M}\p{N}_]+/gu) || []).length > 30) {
    return "Use at most 2,200 characters and 30 hashtags in the combined caption.";
  }
}

export function publishCaption(caption: string, hashtags: string[]) {
  const tags = [...new Set(hashtags.map((tag) => "#" + tag.trim().replace(/^#/, "")))];
  return [caption.trim(), tags.join(" ")].filter(Boolean).join("\n\n");
}

export function checkedMedia(input: unknown) {
  const parsed = publishInput.safeParse(input);
  if (!parsed.success) throw new MetaError("Post media or caption is invalid. Use public HTTPS media and supported formats.");
  const issue = validateMedia(parsed.data);
  if (issue) throw new MetaError(issue);
  return parsed.data;
}

