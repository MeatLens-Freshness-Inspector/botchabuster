import { Request, Response } from "express";
import { rm } from "node:fs/promises";
import { storageService } from "../../infrastructure/StorageService";
import { getRequestAuthContext } from "../../../../middleware/auth";
import { materializeTransportFile, type MaterializedTransportFile } from "../../../../middleware/upload";
import { UploadInspectionImage } from "../../application/UploadInspectionImage";

export class UploadController {
  private readonly uploadImage = new UploadInspectionImage(storageService);
  /**
   * POST /api/upload/inspection-image
   *
   * Uploads an inspection image to secure storage
   * Requires authentication
   *
   * Body: encrypted logical form data with an 'image' transport file
   * Returns: { imageUrl: string }
   */
  async uploadInspectionImage(req: Request, res: Response): Promise<void> {
    let uploadedFile: MaterializedTransportFile | undefined;
    try {
      const transportFile = req.transportFiles?.image;
      if (!transportFile) {
        res.status(400).json({ error: "No image file provided" });
        return;
      }

      const { userId } = getRequestAuthContext(req);
      uploadedFile = await materializeTransportFile(transportFile, {
        maxBytes: 10 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });

      // Upload to storage
      const imageUrl = await this.uploadImage.execute({
        filePath: uploadedFile.path,
        userId,
        originalName: uploadedFile.originalname,
      });

      res.json({ imageUrl });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({
        error: "Image upload failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      if (uploadedFile?.path) await rm(uploadedFile.path, { force: true }).catch(() => undefined);
    }
  }
}
