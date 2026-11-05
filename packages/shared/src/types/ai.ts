export type CaptionTone =
  | "engaging"
  | "educational"
  | "humorous"
  | "urgent"
  | "storytelling"
  | "promotional";

export type ContentLanguage = "hi-en" | "en" | "hi";

export interface IAICaptionRequest {
  topic: string;
  tone?: CaptionTone;
  language?: ContentLanguage;
  contentType?: "POST" | "CAROUSEL" | "REEL";
  targetAudience?: string;
  callToAction?: string;
  includeHashtags?: boolean;
  hashtagCount?: number;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface IAICaptionResponse {
  hook: string;
  body: string;
  callToAction: string;
  fullCaption: string;
  hashtags: string[];
  suggestedReelDuration?: number;
  modelUsed: string;
}
