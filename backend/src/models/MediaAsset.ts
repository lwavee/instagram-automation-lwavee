import mongoose, { Schema, Document } from "mongoose";

export interface IMediaAsset extends Document {
  title: string;
  originalFilename: string;
  fileType: "video" | "image" | "audio";
  mimeType: string;
  sizeBytes: number;
  storageProvider: "local" | "cloudinary" | "supabase";
  url: string;
  publicId?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  dimensions?: {
    width: number;
    height: number;
  };
  tags: string[];
  associatedScriptId?: mongoose.Types.ObjectId;
  campaign?: string;
  topic?: string;
  isUsedInPost: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const MediaAssetSchema = new Schema<IMediaAsset>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      enum: ["video", "image", "audio"],
      required: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    sizeBytes: {
      type: Number,
      required: true,
    },
    storageProvider: {
      type: String,
      enum: ["local", "cloudinary", "supabase"],
      default: "local",
    },
    url: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      default: "",
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    dimensions: {
      width: { type: Number, default: 0 },
      height: { type: Number, default: 0 },
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    associatedScriptId: {
      type: Schema.Types.ObjectId,
      ref: "GeneratedScript",
    },
    campaign: {
      type: String,
      default: "",
    },
    topic: {
      type: String,
      default: "",
    },
    isUsedInPost: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

MediaAssetSchema.index({ fileType: 1, createdAt: -1 });

export const MediaAsset = mongoose.model<IMediaAsset>("MediaAsset", MediaAssetSchema);
