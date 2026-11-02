import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "approval_request";
  linkUrl?: string;
  isRead: boolean;
  relatedEntityId?: mongoose.Types.ObjectId;
  relatedEntityType?: "SocialPost" | "GeneratedScript" | "ContentIdea" | "AutomationExecution";
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["info", "success", "warning", "error", "approval_request"],
      default: "info",
    },
    linkUrl: {
      type: String,
      default: "",
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    relatedEntityId: {
      type: Schema.Types.ObjectId,
    },
    relatedEntityType: {
      type: String,
      enum: ["SocialPost", "GeneratedScript", "ContentIdea", "AutomationExecution"],
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ isRead: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);

