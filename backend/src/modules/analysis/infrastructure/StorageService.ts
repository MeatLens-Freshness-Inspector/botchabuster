import { supabase } from "../../../integrations/supabase";
import * as fs from "fs/promises";
import * as path from "path";

export class StorageService {
  private static instance: StorageService;
  private readonly bucketName = "inspection-images";

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Upload an inspection image to Supabase Storage
   * @param filePath Local path to the uploaded file
   * @param userId User ID for organizing files
   * @param originalName Original filename
   * @returns The public URL of the uploaded image
   */
  async uploadInspectionImage(
    filePath: string,
    userId: string,
    originalName: string
  ): Promise<string> {
    try {
      // Read the file
      const fileBuffer = await fs.readFile(filePath);

      // Generate a unique filename
      const fileExt = path.extname(originalName);
      const fileName = `${userId}/${Date.now()}${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(fileName, fileBuffer, {
          contentType: this.getContentType(fileExt),
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw new Error(`Storage upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(data.path);

      // Clean up the temporary file
      await fs.unlink(filePath).catch(err =>
        console.error("Failed to delete temp file:", err)
      );

      return urlData.publicUrl;
    } catch (error) {
      // Ensure temp file is cleaned up even on error
      await fs.unlink(filePath).catch(() => {});
      throw error;
    }
  }

  /**
   * Delete an inspection image from storage
   * @param imageUrl The full URL of the image to delete
   */
  async deleteInspectionImage(imageUrl: string): Promise<void> {
    try {
      // Extract the file path from the URL
      const url = new URL(imageUrl);
      const pathParts = url.pathname.split(`/${this.bucketName}/`);
      if (pathParts.length < 2) {
        throw new Error("Invalid image URL");
      }
      const filePath = pathParts[1];

      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw new Error(`Storage delete failed: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to delete image:", error);
      // Don't throw - image deletion is not critical
    }
  }

  private getContentType(extension: string): string {
    const ext = extension.toLowerCase();
    switch (ext) {
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".png":
        return "image/png";
      case ".webp":
        return "image/webp";
      default:
        return "application/octet-stream";
    }
  }
}

export const storageService = StorageService.getInstance();
