import mongoose, { Schema, Document } from "mongoose";

export interface IAnalyticsSnapshot extends Document {
  instagramAccountId?: mongoose.Types.ObjectId;
  snapshotDate: Date;
  totalFollowers: number;
  followerGrowth: number;
  totalImpressions: number;
  totalReach: number;
  averageEngagementRate: number;
  postsPublishedTotal: number;
  reelsPublishedTotal: number;
  topPerformingPosts: {
    postId: string;
    title: string;
    mediaType: string;
    reach: number;
    impressions: number;
    engagement: number;
    permalink: string;
  }[];
  topicBreakdown: {
    topic: string;
    postsCount: number;
    avgEngagement: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>(
  {
    instagramAccountId: {
      type: Schema.Types.ObjectId,
      ref: "InstagramAccount",
      index: true,
    },
    snapshotDate: {
      type: Date,
      required: true,
      index: true,
    },
    totalFollowers: {
      type: Number,
      default: 0,
    },
    followerGrowth: {
      type: Number,
      default: 0,
    },
    totalImpressions: {
      type: Number,
      default: 0,
    },
    totalReach: {
      type: Number,
      default: 0,
    },
    averageEngagementRate: {
      type: Number,
      default: 0,
    },
    postsPublishedTotal: {
      type: Number,
      default: 0,
    },
    reelsPublishedTotal: {
      type: Number,
      default: 0,
    },
    topPerformingPosts: [
      {
        postId: { type: String, default: "" },
        title: { type: String, default: "" },
        mediaType: { type: String, default: "REELS" },
        reach: { type: Number, default: 0 },
        impressions: { type: Number, default: 0 },
        engagement: { type: Number, default: 0 },
        permalink: { type: String, default: "" },
      },
    ],
    topicBreakdown: [
      {
        topic: { type: String, default: "" },
        postsCount: { type: Number, default: 0 },
        avgEngagement: { type: Number, default: 0 },
      },
    ],
  },
  {
    timestamps: true,
  }
);

AnalyticsSnapshotSchema.index({ snapshotDate: -1 });

export const AnalyticsSnapshot = mongoose.model<IAnalyticsSnapshot>("AnalyticsSnapshot", AnalyticsSnapshotSchema);
