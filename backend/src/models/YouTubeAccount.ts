import mongoose, { Schema, Document } from "mongoose";

export interface IYouTubeAccount extends Document {
  userId: mongoose.Types.ObjectId;
  channelId: string;
  channelTitle: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  tokenExpiresAt: Date;
  scopes: string[];
  connectedAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IYouTubeAccount>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  channelId: { type: String, required: true },
  channelTitle: { type: String, required: true },
  accessTokenEncrypted: { type: String, required: true, select: false },
  refreshTokenEncrypted: { type: String, required: true, select: false },
  tokenExpiresAt: { type: Date, required: true },
  scopes: { type: [String], default: [] },
  connectedAt: { type: Date, default: Date.now },
}, { timestamps: true });

schema.set("toJSON", {
  transform: (_doc, ret: any) => {
    delete ret.accessTokenEncrypted;
    delete ret.refreshTokenEncrypted;
    return ret;
  },
});

export const YouTubeAccount = mongoose.model<IYouTubeAccount>("YouTubeAccount", schema);
