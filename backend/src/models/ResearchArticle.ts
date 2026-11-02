import mongoose, { Schema, Document } from "mongoose";

export interface IResearchArticle extends Document {
  title: string;
  summary: string;
  url: string;
  source: string;
  topic: string;
  keywords: string[];
  trendingScore: number;
  publishedAt?: Date;
  isUsed: boolean;
  ideasGeneratedCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ResearchArticleSchema = new Schema<IResearchArticle>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      default: "",
    },
    url: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    source: {
      type: String,
      default: "Web Search",
    },
    topic: {
      type: String,
      required: true,
      index: true,
    },
    keywords: {
      type: [String],
      default: [],
      index: true,
    },
    trendingScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },
    publishedAt: {
      type: Date,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    ideasGeneratedCount: {
      type: Number,
      default: 0,
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

ResearchArticleSchema.index({ topic: 1, createdAt: -1 });

export const ResearchArticle = mongoose.model<IResearchArticle>("ResearchArticle", ResearchArticleSchema);

