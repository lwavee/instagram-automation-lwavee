import mongoose, { Document, Schema } from "mongoose";

export type CreatorWorkflowStatus = "queued" | "researching" | "scripting" | "generating" | "assembling" | "completed" | "failed";

export interface ICreatorWorkflow extends Document {
  userId: mongoose.Types.ObjectId;
  idempotencyKey: string;
  niche: string;
  requestedTopic: string;
  topic: string;
  topicRationale: string;
  status: CreatorWorkflowStatus;
  stageMessage: string;
  scriptId?: mongoose.Types.ObjectId;
  scenes: Array<{ sceneNumber: number; prompt: string; durationSeconds: number }>;
  clips: Array<{ sceneNumber: number; url: string; mediaAssetId: mongoose.Types.ObjectId }>;
  research: Array<{ videoId: string; title: string; channelId: string; channelTitle: string; publishedAt: string; viewCount: number; viewsPerHour: number; url: string }>;
  mediaAssetId?: mongoose.Types.ObjectId;
  mediaUrl?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ICreatorWorkflow>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  idempotencyKey: { type: String, required: true },
  niche: { type: String, required: true },
  requestedTopic: { type: String, default: "" },
  topic: { type: String, default: "" },
  topicRationale: { type: String, default: "" },
  status: { type: String, enum: ["queued", "researching", "scripting", "generating", "assembling", "completed", "failed"], default: "queued", index: true },
  stageMessage: { type: String, default: "Queued" },
  scriptId: { type: Schema.Types.ObjectId, ref: "GeneratedScript" },
  scenes: { type: [{ sceneNumber: Number, prompt: String, durationSeconds: Number }], default: [] },
  clips: { type: [{ sceneNumber: Number, url: String, mediaAssetId: Schema.Types.ObjectId }], default: [] },
  research: { type: [new Schema({
    videoId: String, title: String, channelId: String, channelTitle: String,
    publishedAt: String, viewCount: Number, viewsPerHour: Number, url: String,
  }, { _id: false })], default: [] },
  mediaAssetId: { type: Schema.Types.ObjectId, ref: "MediaAsset" },
  mediaUrl: { type: String, default: "" },
  errorMessage: { type: String, default: "" },
}, { timestamps: true });

schema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });
schema.index({ userId: 1, createdAt: -1 });

export const CreatorWorkflow = mongoose.model<ICreatorWorkflow>("CreatorWorkflow", schema);
