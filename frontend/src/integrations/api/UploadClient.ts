const API_BASE_URL =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_API_BASE_URL) ||
  "http://localhost:3001/api";
const SESSION_STORAGE_KEY = "meatlens-auth-session";

export class UploadClient {
  private static instance: UploadClient;

  private constructor() {}

  static getInstance(): UploadClient {
    if (!UploadClient.instance) {
      UploadClient.instance = new UploadClient();
    }
    return UploadClient.instance;
  }

  private getAccessToken(): string | null {
    if (typeof window === "undefined") return null;

    try {
      const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!rawSession) return null;

      const parsedSession = JSON.parse(rawSession) as { access_token?: string | null };
      return parsedSession.access_token ?? null;
    } catch {
      return null;
    }
  }

  private createHeaders(initialHeaders?: HeadersInit): Headers {
    const headers = new Headers(initialHeaders);
    const accessToken = this.getAccessToken();

    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    return headers;
  }

  /**
   * Upload an inspection image through the backend API
   * @param file The image file to upload
   * @returns The public URL of the uploaded image
   */
  async uploadInspectionImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`${API_BASE_URL}/upload/inspection-image`, {
      method: "POST",
      headers: this.createHeaders(),
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || `Upload failed: ${res.statusText}`);
    }

    const data = await res.json();
    return data.imageUrl;
  }
}

export const uploadClient = UploadClient.getInstance();
