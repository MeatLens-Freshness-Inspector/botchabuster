import { createAuthHeaders } from "@/shared/api/auth-headers";
import { notifyApiAuthExpired } from "@/shared/api/request";
import { API_BASE_URL } from "@/shared/api/base-url";
import { fetchWithTimeout } from "@/shared/api";
import type { UserChatContact, UserChatMessage } from "../model/types";

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
    notifyApiAuthExpired();
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
