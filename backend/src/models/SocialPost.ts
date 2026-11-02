import mongoose, { Schema, Document } from "mongoose";

export interface ISocialPost extends Document {
  scriptId?: mongoose.Types.ObjectId;
  mediaAssetId?: mongoose.Types.ObjectId;
  instagramAccountId?: mongoose.Types.ObjectId;
  mediaType: "REELS" | "IMAGE" | "CAROUSEL" | "VIDEO";
  title: string;
  caption: string;
  hashtags: string[];
  mediaUrl: string;
  coverImageUrl?: string;
  status: "draft" | "review_pending" | "approved" | "scheduled" | "publishing" | "published" | "failed";
  isAutoPublish: boolean;
  scheduledPublishTime?: Date;
  publishedAt?: Date;
  instagramPostId?: string;
  instagramMediaContainerId?: string;
  permalink?: string;
  errorMessage?: string;
  retryCount: number;
  publishingLogs: { timestamp: Date; message: string; level: "info" | "warn" | "error" }[];
  metrics?: {
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    savesCount: number;
    reachCount: number;
    impressionsCount: number;
    lastUpdated?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SocialPostSchema = new Schema<ISocialPost>(
  {
    scriptId: {
      type: Schema.Types.ObjectId,
      ref: "GeneratedScript",
      index: true,
    },
    mediaAssetId: {
      type: Schema.Types.ObjectId,
      ref: "MediaAsset",
    },
    instagramAccountId: {
      type: Schema.Types.ObjectId,
      ref: "InstagramAccount",
      index: true,
    },
    mediaType: {
      type: String,
      enum: ["REELS", "IMAGE", "CAROUSEL", "VIDEO"],
      default: "REELS",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      required: true,
    },
    hashtags: {
      type: [String],
      default: [],
    },
    mediaUrl: {
      type: String,
      required: true,
    },
    coverImageUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["draft", "review_pending", "approved", "scheduled", "publishing", "published", "failed"],
      default: "draft",
      index: true,
    },
    isAutoPublish: {
      type: Boolean,
      default: false, // Guardrail: Must be explicitly enabled
    },
    scheduledPublishTime: {
      type: Date,
      index: true,
    },
    publishedAt: {
      type: Date,
      index: true,
    },
    instagramPostId: {
      type: String,
      default: "",
      index: true,
    },
    instagramMediaContainerId: {
      type: String,
      default: "",
    },
    permalink: {
      type: String,
      default: "",
    },
    errorMessage: {
      type: String,
      default: "",
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    publishingLogs: [
      {
        timestamp: { type: Date, default: Date.now },
        message: { type: String, required: true },
        level: { type: String, enum: ["info", "warn", "error"], default: "info" },
      },
    ],
    metrics: {
      likesCount: { type: Number, default: 0 },
      commentsCount: { type: Number, default: 0 },
      sharesCount: { type: Number, default: 0 },
      savesCount: { type: Number, default: 0 },
      reachCount: { type: Number, default: 0 },
      impressionsCount: { type: Number, default: 0 },
      lastUpdated: { type: Date },
    },
  },
  {
    timestamps: true,
  }
);

SocialPostSchema.index({ status: 1, scheduledPublishTime: 1 });

export const SocialPost = mongoose.model<ISocialPost>("SocialPost", SocialPostSchema);
