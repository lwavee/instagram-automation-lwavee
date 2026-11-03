import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env";
import { MediaAsset, IMediaAsset } from "../models/MediaAsset";

// Configure Cloudinary if credentials exist
if (process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export interface SaveFileParams {
  originalName: string;
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  title?: string;
  campaign?: string;
  topic?: string;
  associatedScriptId?: string;
}

export class StorageService {
  private static uploadDir = path.resolve(process.cwd(), "uploads");

  public static ensureUploadDirectory() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Saves uploaded media file to configured storage provider (Cloudinary, Supabase, or Local fallback)
   */
  public static async saveMedia(params: SaveFileParams): Promise<IMediaAsset> {
    const provider = env.MEDIA_STORAGE_PROVIDER;

    // Strict sanitization of original filename to prevent path traversal
    const safeBaseName = path.basename(params.originalName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = path.extname(safeBaseName).toLowerCase();
    const randomHex = crypto.randomBytes(16).toString("hex");
    const uniqueFilename = `${Date.now()}-${randomHex}${ext}`;

    // Determine asset fileType
    let fileType: "video" | "image" | "audio" = "image";
    if (params.mimeType.startsWith("video/")) {
      fileType = "video";
    } else if (params.mimeType.startsWith("audio/")) {
      fileType = "audio";
    }

    let fileUrl = "";
    let publicId = uniqueFilename;
    let effectiveProvider: "local" | "cloudinary" | "supabase" = "local";

    // 1. Upload to Cloudinary if configured
    if ((provider === "cloudinary" || process.env.CLOUDINARY_API_KEY) && process.env.CLOUDINARY_API_KEY) {
      try {
        const uploadResult: any = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: fileType === "video" ? "video" : fileType === "audio" ? "video" : "image",
              folder: "learn_with_avee",
              public_id: `${Date.now()}-${safeBaseName.replace(/\.[^/.]+$/, "")}`,
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          uploadStream.end(params.buffer);
        });

        if (uploadResult?.secure_url) {
          fileUrl = uploadResult.secure_url;
          publicId = uploadResult.public_id;
          effectiveProvider = "cloudinary";
        }
      } catch (cloudErr: any) {
        console.warn("Cloudinary upload failed, falling back to local storage:", cloudErr.message);
      }
    }

    // 2. Local disk fallback
    if (!fileUrl) {
      this.ensureUploadDirectory();
      const targetPath = path.join(this.uploadDir, uniqueFilename);

      // Verify boundary
      if (!targetPath.startsWith(this.uploadDir + path.sep)) {
        throw new Error("Invalid destination file path traversal detected.");
      }

      await fs.promises.writeFile(targetPath, params.buffer);
      fileUrl = `${env.BACKEND_URL}/uploads/${uniqueFilename}`;
      effectiveProvider = "local";
    }

    // Create database asset
    const asset = await MediaAsset.create({
      title: params.title || safeBaseName,
      originalFilename: safeBaseName,
      fileType,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      storageProvider: effectiveProvider,
      url: fileUrl,
      publicId,
      campaign: params.campaign || "",
      topic: params.topic || "",
      associatedScriptId: params.associatedScriptId || undefined,
    });

    return asset;
  }
}
