import mongoose, { Schema, Document } from "mongoose";

export interface IContentSchedule extends Document {
  socialPostId: mongoose.Types.ObjectId;
  scriptId?: mongoose.Types.ObjectId;
  targetPublishTime: Date;
  timezone: string;
  status: "scheduled" | "processing" | "completed" | "cancelled" | "failed";
  recurrence: "none" | "daily" | "weekly";
  daysOfWeek?: number[];
  retryAttempts: number;
  maxRetries: number;
  lastAttemptAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentScheduleSchema = new Schema<IContentSchedule>(
  {
    socialPostId: {
      type: Schema.Types.ObjectId,
      ref: "SocialPost",
      required: true,
      index: true,
    },
    scriptId: {
      type: Schema.Types.ObjectId,
      ref: "GeneratedScript",
    },
    targetPublishTime: {
      type: Date,
      required: true,
      index: true,
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },
    status: {
      type: String,
      enum: ["scheduled", "processing", "completed", "cancelled", "failed"],
      default: "scheduled",
      index: true,
    },
    recurrence: {
      type: String,
      enum: ["none", "daily", "weekly"],
      default: "none",
    },
    daysOfWeek: {
      type: [Number],
      default: [],
    },
    retryAttempts: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    lastAttemptAt: {
      type: Date,
    },
    failureReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

ContentScheduleSchema.index({ status: 1, targetPublishTime: 1 });

export const ContentSchedule = mongoose.model<IContentSchedule>("ContentSchedule", ContentScheduleSchema);

