import { z } from "zod";

export const CreateContentPostSchema = z.object({
  title: z.string().min(1, "Title is required").max(120),
  caption: z.string().min(1, "Caption is required").max(2200),
  hashtags: z.array(z.string()).default([]),
  mediaUrls: z.array(z.string().url("Valid media URL required")).min(1, "At least one media item is required"),
  mediaType: z.enum(["POST", "CAROUSEL", "REEL"]),
  coverImageUrl: z.string().url().optional(),
  scheduledPublishTime: z.string().datetime().optional(),
  timezone: z.string().default("Asia/Kolkata"),
  instagramAccountId: z.string().optional(),
  isAutoPublish: z.boolean().default(false),
});

export const GenerateCaptionSchema = z.object({
  topic: z.string().min(2, "Topic must be at least 2 characters"),
  tone: z.enum(["engaging", "educational", "humorous", "urgent", "storytelling", "promotional"]).default("engaging"),
  language: z.enum(["hi-en", "en", "hi"]).default("hi-en"),
  contentType: z.enum(["POST", "CAROUSEL", "REEL"]).default("REEL"),
  targetAudience: z.string().optional(),
  callToAction: z.string().optional(),
  includeHashtags: z.boolean().default(true),
  hashtagCount: z.number().int().min(1).max(30).default(15),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(50).max(2000).default(800),
});

export const ApprovalDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().max(500).optional(),
});
