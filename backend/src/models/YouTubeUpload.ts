import mongoose, { Schema, Document } from "mongoose";

export interface IYouTubeUpload extends Document {
  userId: mongoose.Types.ObjectId;
  idempotencyKey: string;
  payloadHash: string;
  title: string;
  description: string;
  channelId: string;
  videoId?: string;
  status: "uploading" | "uploaded_private" | "failed" | "unknown";
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IYouTubeUpload>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  idempotencyKey: { type: String, required: true },
  payloadHash: { type: String, required: true },
  title: { type: String, required: true, maxlength: 100 },
  description: { type: String, required: true, maxlength: 5000 },
  channelId: { type: String, required: true },
  videoId: String,
  status: { type: String, enum: ["uploading", "uploaded_private", "failed", "unknown"], required: true },
  errorMessage: { type: String, select: false },
}, { timestamps: true });

schema.index({ userId: 1, idempotencyKey: 1 }, { unique: true });

export const YouTubeUpload = mongoose.model<IYouTubeUpload>("YouTubeUpload", schema);
