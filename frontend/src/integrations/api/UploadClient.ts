import { createAuthHeaders } from "@/lib/authCache";
import { UPLOAD_REQUEST_TIMEOUT_MS, fetchWithTimeout } from "./fetchWithTimeout";

const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL) ||
  "http://localhost:3001/api";

export class UploadClient {
  private static instance: UploadClient;

  private constructor() {}

  static getInstance(): UploadClient {
    if (!UploadClient.instance) {
      UploadClient.instance = new UploadClient();
    }
    return UploadClient.instance;
  }

  private createHeaders(initialHeaders?: HeadersInit): Headers {
    return createAuthHeaders(initialHeaders);
  }

  /**
   * Upload an inspection image through the backend API
   * @param file The image file to upload
   * @returns The public URL of the uploaded image
   */
  async uploadInspectionImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetchWithTimeout(`${API_BASE_URL}/upload/inspection-image`, {
      method: "POST",
      headers: this.createHeaders(),
      body: formData,
    }, UPLOAD_REQUEST_TIMEOUT_MS);

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || `Upload failed: ${res.statusText}`);
    }

    const data = await res.json();
    return data.imageUrl;
  }
}

export const uploadClient = UploadClient.getInstance();
