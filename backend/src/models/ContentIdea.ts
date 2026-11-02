import mongoose, { Schema, Document } from "mongoose";

export interface IContentIdea extends Document {
  topic: string;
  title: string;
  hook: string;
  summary: string;
  targetFormat: "REEL" | "CAROUSEL" | "STORY" | "POST";
  angle: string;
  estimatedDurationSeconds: number;
  tags: string[];
  status: "pending" | "approved" | "rejected" | "scripted";
  sourceArticleId?: mongoose.Types.ObjectId;
  sourceUrl?: string;
  rejectionReason?: string;
  approvedAt?: Date;
  generatedScriptId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ContentIdeaSchema = new Schema<IContentIdea>(
  {
    topic: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    hook: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      default: "",
    },
    targetFormat: {
      type: String,
      enum: ["REEL", "CAROUSEL", "STORY", "POST"],
      default: "REEL",
    },
    angle: {
      type: String,
      default: "Educational & Quick Tip",
    },
    estimatedDurationSeconds: {
      type: Number,
      default: 45,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "scripted"],
      default: "pending",
      index: true,
    },
    sourceArticleId: {
      type: Schema.Types.ObjectId,
      ref: "ResearchArticle",
    },
    sourceUrl: {
      type: String,
      default: "",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    approvedAt: {
      type: Date,
    },
    generatedScriptId: {
      type: Schema.Types.ObjectId,
      ref: "GeneratedScript",
    },
  },
  {
    timestamps: true,
  }
);

ContentIdeaSchema.index({ status: 1, createdAt: -1 });

export const ContentIdea = mongoose.model<IContentIdea>("ContentIdea", ContentIdeaSchema);
