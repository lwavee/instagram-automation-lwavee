import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  _id: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const YouTubeOAuthState = mongoose.model("YouTubeOAuthState", schema);
