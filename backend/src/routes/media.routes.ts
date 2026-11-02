import { Router, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { MediaAsset } from "../models/MediaAsset";
import { StorageService } from "../services/storageService";
import { ActivityLog } from "../models/ActivityLog";

const router = Router();

// Configure Multer in-memory storage for secure inspection
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "video/mp4",
      "video/quicktime",
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type ${file.mimetype}. Only JPEG, PNG, WEBP, MP4, MOV, and MP3 are allowed.`));
    }
  },
});

// GET /api/media
router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileType, campaign, topic, limit = "20", page = "1" } = req.query as Record<string, string>;
      const query: any = {};

      if (fileType) query.fileType = fileType;
      if (campaign) query.campaign = campaign;
      if (topic) query.topic = topic;

      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [assets, total] = await Promise.all([
        MediaAsset.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
        MediaAsset.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: {
          assets,
          pagination: {
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/media/upload
router.post(
  "/upload",
  authenticateToken,
  upload.single("file"),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: { message: "No file uploaded." } });
        return;
      }

      const { title, campaign, topic, associatedScriptId } = req.body;

      const asset = await StorageService.saveMedia({
        originalName: req.file.originalname,
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        title,
        campaign,
        topic,
        associatedScriptId,
      });

      await ActivityLog.create({
        action: "MEDIA_UPLOADED",
        performedBy: req.user!.email,
        entityType: "MediaAsset",
        entityId: asset._id.toString(),
        details: { filename: asset.originalFilename, fileType: asset.fileType, size: asset.sizeBytes },
        status: "success",
      });

      res.status(201).json({
        success: true,
        data: { asset },
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/media/:id
router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const asset = await MediaAsset.findByIdAndDelete(req.params.id);
      if (!asset) {
        res.status(404).json({ success: false, error: { message: "Media asset not found." } });
        return;
      }

      res.json({ success: true, data: { message: "Media asset deleted successfully." } });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
