import mongoose, { Schema, Document } from "mongoose";

export interface IAIProviderConfig extends Document {
  provider: "gemini" | "openai" | "openrouter";
  apiKeyEncrypted: string;
  defaultModel: string;
  availableModels: string[];
  isEnabled: boolean;
  isTestedSuccessfully: boolean;
  lastTestedAt?: Date;
  testError?: string;
  usageStats: {
    totalTokens: number;
    requestsCount: number;
    errorCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AIProviderConfigSchema = new Schema<IAIProviderConfig>(
  {
    provider: {
      type: String,
      enum: ["gemini", "openai", "openrouter"],
      required: true,
      unique: true,
      index: true,
    },
    apiKeyEncrypted: {
      type: String,
      required: true,
    },
    defaultModel: {
      type: String,
      required: true,
    },
    availableModels: {
      type: [String],
      default: [],
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
    isTestedSuccessfully: {
      type: Boolean,
      default: false,
    },
    lastTestedAt: {
      type: Date,
    },
    testError: {
      type: String,
      default: "",
    },
    usageStats: {
      totalTokens: { type: Number, default: 0 },
      requestsCount: { type: Number, default: 0 },
      errorCount: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

AIProviderConfigSchema.set("toJSON", {
  transform: (_, ret: any) => {
    delete ret.apiKeyEncrypted;
    return ret;
  },
});

export const AIProviderConfig = mongoose.model<IAIProviderConfig>("AIProviderConfig", AIProviderConfigSchema);
