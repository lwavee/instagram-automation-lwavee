import fs from "fs";
import path from "path";
import crypto from "crypto";
import { env } from "../config/env";
import { MediaAsset, IMediaAsset } from "../models/MediaAsset";

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
   * Saves uploaded media file to configured storage provider (Local, Cloudinary, or Supabase)
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

    if (provider === "local" || !process.env.CLOUDINARY_API_KEY) {
      // Local storage fallback
      this.ensureUploadDirectory();
      const targetPath = path.join(this.uploadDir, uniqueFilename);

      // Verify boundary
      if (!targetPath.startsWith(this.uploadDir + path.sep)) {
        throw new Error("Invalid destination file path traversal detected.");
      }

      await fs.promises.writeFile(targetPath, params.buffer);
      fileUrl = `${env.BACKEND_URL}/uploads/${uniqueFilename}`;
    }

    // Create database asset
    const asset = await MediaAsset.create({
      title: params.title || safeBaseName,
      originalFilename: safeBaseName,
      fileType,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      storageProvider: provider,
      url: fileUrl,
      publicId,
      campaign: params.campaign || "",
      topic: params.topic || "",
      associatedScriptId: params.associatedScriptId || undefined,
    });

    return asset;
  }
}

