import mongoose, { Schema, Document } from "mongoose";

export interface IScene {
  sceneNumber: number;
  durationSeconds: number;
  visualDescription: string;
  onScreenText: string;
  voiceoverHindi: string;
  voiceoverHinglish?: string;
}

export interface IGeneratedScript extends Document {
  contentIdeaId?: mongoose.Types.ObjectId;
  topic: string;
  reelTitle: string;
  format: "REEL" | "CAROUSEL" | "STORY" | "POST";
  language: "Hinglish" | "Hindi" | "English";
  openingHook: string;
  scenes: IScene[];
  fullVoiceover: string;
  onScreenSummary: string[];
  caption: string;
  hashtags: string[];
  cta: string;
  suggestedDurationSeconds: number;
  status: "draft" | "approved" | "rejected" | "ready_to_record" | "scheduled" | "published";
  aiProvider: string;
  aiModel: string;
  userFeedback?: string;
  approvedAt?: Date;
  socialPostId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SceneSchema = new Schema<IScene>(
  {
    sceneNumber: { type: Number, required: true },
    durationSeconds: { type: Number, required: true, default: 5 },
    visualDescription: { type: String, required: true },
    onScreenText: { type: String, default: "" },
    voiceoverHindi: { type: String, required: true },
    voiceoverHinglish: { type: String, default: "" },
  },
  { _id: false }
);

const GeneratedScriptSchema = new Schema<IGeneratedScript>(
  {
    contentIdeaId: {
      type: Schema.Types.ObjectId,
      ref: "ContentIdea",
      index: true,
    },
    topic: {
      type: String,
      required: true,
      index: true,
    },
    reelTitle: {
      type: String,
      required: true,
      trim: true,
    },
    format: {
      type: String,
      enum: ["REEL", "CAROUSEL", "STORY", "POST"],
      default: "REEL",
    },
    language: {
      type: String,
      enum: ["Hinglish", "Hindi", "English"],
      default: "Hinglish",
    },
    openingHook: {
      type: String,
      required: true,
    },
    scenes: {
      type: [SceneSchema],
      default: [],
    },
    fullVoiceover: {
      type: String,
      required: true,
    },
    onScreenSummary: {
      type: [String],
      default: [],
    },
    caption: {
      type: String,
      required: true,
    },
    hashtags: {
      type: [String],
      default: [],
    },
    cta: {
      type: String,
      default: "Follow @learnwithavee for more AI secrets & save this Reel!",
    },
    suggestedDurationSeconds: {
      type: Number,
      default: 45,
    },
    status: {
      type: String,
      enum: ["draft", "approved", "rejected", "ready_to_record", "scheduled", "published"],
      default: "draft",
      index: true,
    },
    aiProvider: {
      type: String,
      default: "gemini",
    },
    aiModel: {
      type: String,
      default: "gemini-2.5-flash",
    },
    userFeedback: {
      type: String,
      default: "",
    },
    approvedAt: {
      type: Date,
    },
    socialPostId: {
      type: Schema.Types.ObjectId,
      ref: "SocialPost",
    },
  },
  {
    timestamps: true,
  }
);

GeneratedScriptSchema.index({ status: 1, createdAt: -1 });

export const GeneratedScript = mongoose.model<IGeneratedScript>("GeneratedScript", GeneratedScriptSchema);

