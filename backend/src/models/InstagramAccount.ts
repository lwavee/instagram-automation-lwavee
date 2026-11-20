import mongoose, { Schema, Document } from "mongoose";

export interface IInstagramAccount extends Document {
  userId: mongoose.Types.ObjectId;
  instagramId: string;
  username: string;
  name?: string;
  accountType: "BUSINESS" | "CREATOR" | "PERSONAL";
  profilePictureUrl?: string;
  followersCount: number;
  followsCount: number;
  mediaCount: number;
  accessTokenEncrypted?: string;
  pageTokenEncrypted?: string;
  tokenExpiresAt?: Date;
  pageId?: string;
  pageName?: string;
  pageTasks: string[];
  authorizationAppId?: string;
  metaUserId?: string;
  lastAuthorizedAt?: Date;
  isConnected: boolean;
  lastSyncedAt?: Date;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const InstagramAccountSchema = new Schema<IInstagramAccount>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    instagramId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      default: "",
    },
    accountType: {
      type: String,
      enum: ["BUSINESS", "CREATOR", "PERSONAL"],
      default: "BUSINESS",
    },
    profilePictureUrl: {
      type: String,
      default: "",
    },
    followersCount: {
      type: Number,
      default: 0,
    },
    followsCount: {
      type: Number,
      default: 0,
    },
    mediaCount: {
      type: Number,
      default: 0,
    },
    accessTokenEncrypted: {
      type: String,
      select: false,
    },
    pageTokenEncrypted: { type: String, select: false },
    tokenExpiresAt: {
      type: Date,
    },
    pageId: {
      type: String,
      default: "",
    },
    pageName: String,
    pageTasks: { type: [String], default: [] },
    authorizationAppId: String,
    metaUserId: { type: String, select: false },
    lastAuthorizedAt: Date,
    isConnected: {
      type: Boolean,
      default: true,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
    permissions: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

InstagramAccountSchema.set("toJSON", {
  transform: (_, ret: any) => {
    delete ret.accessTokenEncrypted;
    delete ret.pageTokenEncrypted;
    delete ret.metaUserId;
    return ret;
  },
});

export const InstagramAccount = mongoose.model<IInstagramAccount>("InstagramAccount", InstagramAccountSchema);
