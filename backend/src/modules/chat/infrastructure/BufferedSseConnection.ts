import type { ChatStreamClient, ChatStreamEvent } from "./ChatRealtimeHub";

export const MAX_CHAT_QUEUE_EVENTS = 100;
export const MAX_CHAT_QUEUE_BYTES = 256 * 1024;

export interface SseWriter {
  write(frame: string): boolean;
  once(event: "drain", listener: () => void): void;
  end(): void;
}

interface BufferedSseConnectionOptions {
  id: string;
  userId: string;
  createdAt: number;
  writer: SseWriter;
  maxQueuedEvents?: number;
  maxQueuedBytes?: number;
  onClose?: (reason: string) => void;
}

export function formatSseEvent(event: ChatStreamEvent, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export class BufferedSseConnection implements ChatStreamClient {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: number;

  private readonly writer: SseWriter;
  private readonly maxQueuedEvents: number;
  private readonly maxQueuedBytes: number;
  private readonly onClose?: (reason: string) => void;
  private readonly queue: Array<{ frame: string; bytes: number }> = [];
  private queuedBytes = 0;
  private waitingForDrain = false;
  private closed = false;

  constructor(options: BufferedSseConnectionOptions) {
    this.id = options.id;
    this.userId = options.userId;
    this.createdAt = options.createdAt;
    this.writer = options.writer;
    this.maxQueuedEvents = options.maxQueuedEvents ?? MAX_CHAT_QUEUE_EVENTS;
    this.maxQueuedBytes = options.maxQueuedBytes ?? MAX_CHAT_QUEUE_BYTES;
    this.onClose = options.onClose;
  }

  send(event: ChatStreamEvent, data: unknown): boolean {
    if (this.closed) return false;

    const frame = formatSseEvent(event, data);
    if (!this.waitingForDrain && this.queue.length === 0) {
      if (!this.writer.write(frame)) this.waitForDrain();
      return true;
    }

    const bytes = Buffer.byteLength(frame);
    if (
      this.queue.length >= this.maxQueuedEvents ||
      this.queuedBytes + bytes > this.maxQueuedBytes
    ) {
      this.close("backpressure_overflow");
      return false;
    }

    this.queue.push({ frame, bytes });
    this.queuedBytes += bytes;
    return true;
  }

  close(reason: string): void {
    if (this.closed) return;
    this.closed = true;
    this.queue.length = 0;
    this.queuedBytes = 0;
    this.writer.end();
    this.onClose?.(reason);
  }

  private waitForDrain(): void {
    if (this.waitingForDrain || this.closed) return;
    this.waitingForDrain = true;
    this.writer.once("drain", () => {
      this.waitingForDrain = false;
      this.flush();
    });
  }

  private flush(): void {
    while (!this.closed && !this.waitingForDrain && this.queue.length > 0) {
      const next = this.queue.shift()!;
      this.queuedBytes -= next.bytes;
      if (!this.writer.write(next.frame)) this.waitForDrain();
    }
  }
}
