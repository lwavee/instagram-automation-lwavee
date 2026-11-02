import mongoose, { Schema, Document } from "mongoose";

export interface IIntegrationConfig extends Document {
  service: "instagram" | "n8n" | "cloudinary" | "supabase" | "search_api";
  credentialsEncrypted: string;
  settings: Record<string, any>;
  isConnected: boolean;
  lastVerifiedAt?: Date;
  statusMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationConfigSchema = new Schema<IIntegrationConfig>(
  {
    service: {
      type: String,
      enum: ["instagram", "n8n", "cloudinary", "supabase", "search_api"],
      required: true,
      unique: true,
      index: true,
    },
    credentialsEncrypted: {
      type: String,
      default: "",
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isConnected: {
      type: Boolean,
      default: false,
    },
    lastVerifiedAt: {
      type: Date,
    },
    statusMessage: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

IntegrationConfigSchema.set("toJSON", {
  transform: (_, ret: any) => {
    delete ret.credentialsEncrypted;
    return ret;
  },
});

export const IntegrationConfig = mongoose.model<IIntegrationConfig>("IntegrationConfig", IntegrationConfigSchema);
