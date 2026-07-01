import { Request, Response } from "express";
import { storageService } from "../services/StorageService";
import { getRequestAuthContext } from "../middleware/auth";

export class UploadController {
  /**
   * POST /api/upload/inspection-image
   *
   * Uploads an inspection image to secure storage
   * Requires authentication
   *
   * Body: multipart/form-data with 'image' field
   * Returns: { imageUrl: string }
   */
  async uploadInspectionImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image file provided" });
        return;
      }

      const { userId } = getRequestAuthContext(req);

      // Validate file size (already done by multer, but double-check)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (req.file.size > maxSize) {
        res.status(400).json({ error: "File size exceeds 10MB limit" });
        return;
      }

      // Upload to storage
      const imageUrl = await storageService.uploadInspectionImage(
        req.file.path,
        userId,
        req.file.originalname
      );

      res.json({ imageUrl });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        error: "Image upload failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
