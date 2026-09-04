import { API_BASE_URL } from "@/shared/api/base-url";
import { createAuthHeaders } from "@/shared/api/auth-headers";
import { fetchWithTimeout } from "@/shared/api/fetch-with-timeout";
import { notifyApiAuthExpired } from "@/shared/api/request";
import type { UserChatMessage } from "../model/types";

export type UserChatStreamStatus = "connecting" | "connected" | "realtime_unavailable";

export type UserChatStreamEvent =
  | { type: "message"; message: UserChatMessage }
  | { type: "status"; state: UserChatStreamStatus };

interface OpenMessageEventStreamOptions {
  signal: AbortSignal;
  onMessage: (message: UserChatMessage) => void;
  onStatus: (status: UserChatStreamStatus) => void;
}

export class MessageStreamConnectionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "MessageStreamConnectionError";
  }
}

const MESSAGE_KEYS = ["id", "sender_id", "recipient_id", "content", "created_at"] as const;
const STREAM_STATUSES = new Set<UserChatStreamStatus>([
  "connecting",
  "connected",
  "realtime_unavailable",
]);

function parseMessage(value: unknown): UserChatMessage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (MESSAGE_KEYS.some((key) => typeof row[key] !== "string")) return null;
  return {
    id: row.id as string,
    sender_id: row.sender_id as string,
    recipient_id: row.recipient_id as string,
    content: row.content as string,
    created_at: row.created_at as string,
  };
}

function parseFrame(frame: string): UserChatStreamEvent | null {
  let eventName = "";
  const dataLines: string[] = [];
  for (const line of frame.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    const separator = line.indexOf(":");
    const field = separator >= 0 ? line.slice(0, separator) : line;
    const rawValue = separator >= 0 ? line.slice(separator + 1) : "";
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue;
    if (field === "event") eventName = value;
    if (field === "data") dataLines.push(value);
  }
  if (!eventName || dataLines.length === 0) return null;

  let data: unknown;
  try {
    data = JSON.parse(dataLines.join("\n"));
  } catch {
    return null;
  }

  if (eventName === "message") {
    const message = parseMessage(data);
    return message ? { type: "message", message } : null;
  }
  if (eventName === "status" && data && typeof data === "object" && !Array.isArray(data)) {
    const state = (data as { state?: unknown }).state;
    return typeof state === "string" && STREAM_STATUSES.has(state as UserChatStreamStatus)
      ? { type: "status", state: state as UserChatStreamStatus }
      : null;
  }
  return null;
}

function lineEndingLengthAt(value: string, index: number): number {
  if (value[index] === "\n") return 1;
  if (value[index] !== "\r") return 0;
  return value[index + 1] === "\n" ? 2 : 1;
}

function findEventBoundary(value: string): { index: number; length: number } | null {
  for (let index = 0; index < value.length; index += 1) {
    const firstLength = lineEndingLengthAt(value, index);
    if (firstLength === 0) continue;
    const secondLength = lineEndingLengthAt(value, index + firstLength);
    if (secondLength > 0) return { index, length: firstLength + secondLength };
    index += firstLength - 1;
  }
  return null;
}

export async function* parseMessageEventStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<UserChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let boundary = findEventBoundary(buffer);
      while (boundary) {
        const frame = buffer
          .slice(0, boundary.index)
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "\n");
        buffer = buffer.slice(boundary.index + boundary.length);
        const event = parseFrame(frame);
        if (event) yield event;
        boundary = findEventBoundary(buffer);
      }

      if (done) return;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function openMessageEventStream(
  options: OpenMessageEventStreamOptions,
): Promise<void> {
  const response = await fetchWithTimeout(`${API_BASE_URL}/user-chat/events`, {
    method: "GET",
    headers: createAuthHeaders({ Accept: "text/event-stream" }),
    cache: "no-store",
    signal: options.signal,
  });

  if (response.status === 401) {
    notifyApiAuthExpired();
    throw new MessageStreamConnectionError(
      "Session expired. Please sign in again.",
      response.status,
      false,
    );
  }
  if (!response.ok) {
    throw new MessageStreamConnectionError(
      `Failed to connect live messages: HTTP ${response.status}`,
      response.status,
      response.status >= 500 || response.status === 408,
    );
  }
  if (!response.body) {
    throw new Error("Live message stream did not provide a response body.");
  }

  for await (const event of parseMessageEventStream(response.body)) {
    if (event.type === "message") options.onMessage(event.message);
    else options.onStatus(event.state);
  }

  if (!options.signal.aborted) {
    throw new Error("Live message stream ended unexpectedly.");
  }
}
