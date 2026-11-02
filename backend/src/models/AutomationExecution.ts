import mongoose, { Schema, Document } from "mongoose";

export interface IAutomationExecution extends Document {
  workflowName: string;
  workflowId?: string;
  triggerType: "scheduled" | "webhook" | "manual";
  status: "running" | "completed" | "failed" | "retrying";
  itemsProcessed: number;
  payloadSummary?: string;
  logs: { timestamp: Date; message: string; level: "info" | "warn" | "error" }[];
  errorDetails?: {
    message: string;
    code?: string;
    details?: string;
  };
  durationMs?: number;
  startedAt: Date;
  finishedAt?: Date;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

const AutomationExecutionSchema = new Schema<IAutomationExecution>(
  {
    workflowName: {
      type: String,
      required: true,
      index: true,
    },
    workflowId: {
      type: String,
      default: "",
    },
    triggerType: {
      type: String,
      enum: ["scheduled", "webhook", "manual"],
      default: "manual",
    },
    status: {
      type: String,
      enum: ["running", "completed", "failed", "retrying"],
      default: "running",
      index: true,
    },
    itemsProcessed: {
      type: Number,
      default: 0,
    },
    payloadSummary: {
      type: String,
      default: "",
    },
    logs: [
      {
        timestamp: { type: Date, default: Date.now },
        message: { type: String, required: true },
        level: { type: String, enum: ["info", "warn", "error"], default: "info" },
      },
    ],
    errorDetails: {
      message: { type: String },
      code: { type: String },
      details: { type: String },
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    finishedAt: {
      type: Date,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
  },
  {
    timestamps: true,
  }
);

AutomationExecutionSchema.index({ workflowName: 1, createdAt: -1 });

export const AutomationExecution = mongoose.model<IAutomationExecution>("AutomationExecution", AutomationExecutionSchema);

