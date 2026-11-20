import mongoose, { Schema, Document } from "mongoose";

export const postStatuses = ["draft", "review_pending", "approved", "scheduled", "publishing", "processing", "published", "failed", "review_required"] as const;

export interface ISocialPost extends Document {
  userId?: mongoose.Types.ObjectId;
  scriptId?: mongoose.Types.ObjectId;
  mediaAssetId?: mongoose.Types.ObjectId;
  instagramAccountId?: mongoose.Types.ObjectId;
  destination: "instagram" | "facebook";
  mediaType: "REELS" | "IMAGE" | "CAROUSEL" | "VIDEO" | "TEXT";
  title: string;
  caption: string;
  hashtags: string[];
  mediaUrl: string;
  mediaItems: { type: "IMAGE" | "VIDEO"; url: string }[];
  coverImageUrl?: string;
  status: typeof postStatuses[number];
  isAutoPublish: boolean;
  scheduledPublishTime?: Date;
  publishedAt?: Date;
  instagramPostId?: string;
  instagramMediaContainerId?: string;
  instagramChildContainerIds: string[];
  facebookPostId?: string;
  publishClaim?: string;
  leaseUntil?: Date;
  publishMode?: "manual" | "scheduled";
  nextAttemptAt?: Date;
  processingDeadline?: Date;
  publishSubmittedAt?: Date;
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

const mediaItemSchema = new Schema<ISocialPost["mediaItems"][number]>({
  type: { type: String, enum: ["IMAGE", "VIDEO"], required: true },
  url: { type: String, required: true },
}, { _id: false });

const SocialPostSchema = new Schema<ISocialPost>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
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
      enum: ["REELS", "IMAGE", "CAROUSEL", "VIDEO", "TEXT"],
      default: "REELS",
    },
    destination: { type: String, enum: ["instagram", "facebook"], default: "instagram" },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    caption: {
      type: String,
      default: "",
    },
    hashtags: {
      type: [String],
      default: [],
    },
    mediaUrl: {
      type: String,
      default: "",
    },
    mediaItems: {
      type: [mediaItemSchema],
      default: [],
    },
    coverImageUrl: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: postStatuses,
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
    instagramChildContainerIds: { type: [String], default: [] },
    facebookPostId: String,
    publishClaim: String,
    leaseUntil: Date,
    publishMode: { type: String, enum: ["manual", "scheduled"] },
    nextAttemptAt: Date,
    processingDeadline: Date,
    publishSubmittedAt: Date,
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
SocialPostSchema.index({ status: 1, nextAttemptAt: 1 });

export const SocialPost = mongoose.model<ISocialPost>("SocialPost", SocialPostSchema);

