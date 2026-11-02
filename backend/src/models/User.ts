import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: "admin" | "editor" | "viewer";
  avatar?: string;
  preferences: {
    defaultLanguage: "hi-en" | "hi" | "en";
    autoPublishEnabled: boolean;
    defaultTimezone: string;
    targetTopics: string[];
  };
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "editor", "viewer"],
      default: "admin",
    },
    avatar: {
      type: String,
      default: "",
    },
    preferences: {
      defaultLanguage: {
        type: String,
        enum: ["hi-en", "hi", "en"],
        default: "hi-en",
      },
      autoPublishEnabled: {
        type: Boolean,
        default: false, // Critical: Auto publishing MUST be disabled by default
      },
      defaultTimezone: {
        type: String,
        default: "Asia/Kolkata",
      },
      targetTopics: {
        type: [String],
        default: [
          "Artificial Intelligence",
          "ChatGPT & LLMs",
          "Prompt Engineering",
          "AI Tools & Automation",
          "Web Development",
          "Cyber Security",
          "Productivity Apps",
        ],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Never expose password hash in toJSON output
UserSchema.set("toJSON", {
  transform: (_, ret: any) => {
    delete ret.passwordHash;
    return ret;
  },
});

export const User = mongoose.model<IUser>("User", UserSchema);
