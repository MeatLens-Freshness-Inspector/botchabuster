import { clearCachedAuth, createAuthHeaders } from "@/lib/authCache";
import { fetchWithTimeout } from "./fetchWithTimeout";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
const AUTH_EXPIRED_EVENT = "meatlens:auth-expired";

export interface UserChatContact {
  id: string;
  full_name: string | null;
  email: string | null;
  inspector_code: string | null;
  location: string | null;
  role: "admin" | "user";
  last_message_preview: string | null;
  last_message_at: string | null;
}

export interface UserChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
}

export class UserChatClient {
  private static instance: UserChatClient;

  private constructor() {}

  static getInstance(): UserChatClient {
    if (!UserChatClient.instance) {
      UserChatClient.instance = new UserChatClient();
    }
    return UserChatClient.instance;
  }

  private createHeaders(initialHeaders?: HeadersInit): Headers {
    return createAuthHeaders(initialHeaders);
  }

  private async readApiError(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as { error?: unknown; message?: unknown };
      if (typeof payload.error === "string" && payload.error.trim().length > 0) {
        return payload.error.trim();
      }
      if (typeof payload.message === "string" && payload.message.trim().length > 0) {
        return payload.message.trim();
      }
    } catch {
      // Ignore JSON parse errors and fall through.
    }

    if (response.statusText && response.statusText.trim().length > 0) {
      return response.statusText.trim();
    }

    return `HTTP ${response.status}`;
  }

  private notifyAuthExpired(): void {
    if (typeof window === "undefined") return;
    clearCachedAuth();
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }

  private async createRequestError(action: string, response: Response): Promise<Error> {
    if (response.status === 401) {
      this.notifyAuthExpired();
      return new Error("Session expired. Please sign in again.");
    }

    const details = await this.readApiError(response);
    return new Error(`Failed to ${action}: ${details}`);
  }

  async getContacts(): Promise<UserChatContact[]> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/user-chat/contacts`, {
      headers: this.createHeaders(),
    });

    if (!response.ok) {
      throw await this.createRequestError("fetch chat contacts", response);
    }

    return response.json();
  }

  async getMessages(counterpartyId: string, limit = 250): Promise<UserChatMessage[]> {
    const clampedLimit = Math.max(1, Math.min(limit, 500));
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/user-chat/messages/${encodeURIComponent(counterpartyId)}?limit=${clampedLimit}`,
      {
        headers: this.createHeaders(),
      }
    );

    if (!response.ok) {
      throw await this.createRequestError("fetch chat messages", response);
    }

    return response.json();
  }

  async sendMessage(recipientId: string, content: string): Promise<UserChatMessage> {
    const response = await fetchWithTimeout(`${API_BASE_URL}/user-chat/messages`, {
      method: "POST",
      headers: this.createHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        recipientId,
        content,
      }),
    });

    if (!response.ok) {
      throw await this.createRequestError("send chat message", response);
    }

    return response.json();
  }
}

export const userChatClient = UserChatClient.getInstance();
