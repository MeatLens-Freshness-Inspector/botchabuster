import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageStreamConnectionError,
  openMessageEventStream,
  type UserChatMessage,
  type UserChatStreamStatus,
} from "@/entities/message";

export const MESSAGE_STREAM_RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 15_000, 30_000] as const;
const ACTIVATION_REFRESH_COALESCE_MS = 1_000;
export type MessageStreamStatus = "connecting" | "connected" | "disconnected";

type ScheduledHandle = unknown;

interface OpenStreamOptions {
  signal: AbortSignal;
  onMessage: (message: UserChatMessage) => void;
  onStatus: (status: UserChatStreamStatus) => void;
}

export interface UseMessageStreamOptions {
  enabled: boolean;
  identity?: string | null;
  openStream?: (options: OpenStreamOptions) => Promise<void>;
  onMessage: (message: UserChatMessage) => void;
  onGap: () => Promise<void> | void;
  schedule?: (callback: () => void, delayMs: number) => ScheduledHandle;
  cancelSchedule?: (handle: ScheduledHandle) => void;
  nowMs?: () => number;
}

export interface MessageStreamController {
  status: MessageStreamStatus;
  reconnect: () => void;
}

function canStreamNow(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    navigator.onLine &&
    document.visibilityState === "visible"
  );
}

export function useMessageStream(options: UseMessageStreamOptions): MessageStreamController {
  const [status, setStatus] = useState<MessageStreamStatus>("disconnected");
  const openStreamRef = useRef(options.openStream ?? openMessageEventStream);
  const onMessageRef = useRef(options.onMessage);
  const onGapRef = useRef(options.onGap);
  const scheduleRef = useRef(
    options.schedule ?? ((callback: () => void, delayMs: number) => window.setTimeout(callback, delayMs)),
  );
  const cancelScheduleRef = useRef(
    options.cancelSchedule ?? ((handle: ScheduledHandle) => window.clearTimeout(handle as number)),
  );
  const openStreamPromiseRef = useRef<Promise<void> | null>(null);
  const reconnectRef = useRef<() => void>(() => {});
  const nowMsRef = useRef(options.nowMs ?? (() => Date.now()));

  openStreamRef.current = options.openStream ?? openMessageEventStream;
  onMessageRef.current = options.onMessage;
  onGapRef.current = options.onGap;
  scheduleRef.current = options.schedule ?? ((callback, delayMs) => window.setTimeout(callback, delayMs));
  cancelScheduleRef.current = options.cancelSchedule ?? ((handle) => window.clearTimeout(handle as number));
  nowMsRef.current = options.nowMs ?? (() => Date.now());

  useEffect(() => {
    if (!options.enabled || typeof window === "undefined" || typeof document === "undefined") {
      setStatus("disconnected");
      reconnectRef.current = () => {};
      return;
    }

    let disposed = false;
    let generation = 0;
    let controller: AbortController | null = null;
    let retryHandle: ScheduledHandle | null = null;
    let retryIndex = 0;
    let localStatus: MessageStreamStatus = "disconnected";
    let gapPromise: Promise<void> | null = null;
    let recoverSnapshotOnReady = false;
    let lastVisibilityRefreshAt = Number.NEGATIVE_INFINITY;
    let waitingForOpenStream = false;

    const updateStatus = (nextStatus: MessageStreamStatus) => {
      localStatus = nextStatus;
      if (!disposed) setStatus(nextStatus);
    };

    const runGap = (): Promise<void> => {
      if (gapPromise) return gapPromise;
      gapPromise = Promise.resolve(onGapRef.current()).finally(() => {
        gapPromise = null;
      });
      return gapPromise;
    };

    const cancelRetry = () => {
      if (retryHandle === null) return;
      cancelScheduleRef.current(retryHandle);
      retryHandle = null;
    };

    const pause = (showDisconnected: boolean) => {
      generation += 1;
      cancelRetry();
      const activeController = controller;
      controller = null;
      activeController?.abort();
      if (showDisconnected) updateStatus("disconnected");
    };

    const start = () => {
      if (disposed || !canStreamNow() || controller || retryHandle !== null) return;
      const previousOpenStream = openStreamPromiseRef.current;
      if (previousOpenStream) {
        if (waitingForOpenStream) return;
        waitingForOpenStream = true;
        void previousOpenStream.then(
          () => {
            waitingForOpenStream = false;
            if (!disposed) start();
          },
          () => {
            waitingForOpenStream = false;
            if (!disposed) start();
          },
        );
        return;
      }

      const streamGeneration = ++generation;
      const streamController = new AbortController();
      controller = streamController;
      updateStatus("connecting");

      const openStreamPromise = openStreamRef.current({
        signal: streamController.signal,
        onMessage: (message) => {
          if (!disposed && generation === streamGeneration) onMessageRef.current(message);
        },
        onStatus: (streamStatus) => {
          if (disposed || generation !== streamGeneration) return;
          if (streamStatus === "connected") {
            retryIndex = 0;
            updateStatus("connected");
            if (recoverSnapshotOnReady) {
              recoverSnapshotOnReady = false;
              void runGap();
            }
          } else if (streamStatus === "connecting") {
            recoverSnapshotOnReady = true;
            updateStatus("connecting");
          } else {
            updateStatus("disconnected");
            controller = null;
            streamController.abort();
          }
        },
      });
      const trackedOpenStreamPromise = openStreamPromise.then(
        () => {
          openStreamPromiseRef.current = null;
        },
        (error: unknown) => {
          openStreamPromiseRef.current = null;
          throw error;
        },
      );
      openStreamPromiseRef.current = trackedOpenStreamPromise;

      void trackedOpenStreamPromise.then(
        () => {
          if (!streamController.signal.aborted) {
            throw new Error("Live message stream ended unexpectedly.");
          }
        },
        (error) => {
          if (streamController.signal.aborted) return;
          throw error;
        },
      ).catch((error: unknown) => {
        if (disposed || generation !== streamGeneration || streamController.signal.aborted) return;
        controller = null;
        updateStatus("disconnected");
        recoverSnapshotOnReady = true;
        if (error instanceof MessageStreamConnectionError && !error.retryable) return;
        if (retryIndex >= MESSAGE_STREAM_RETRY_DELAYS_MS.length) return;
        const delayMs = MESSAGE_STREAM_RETRY_DELAYS_MS[retryIndex];
        retryIndex += 1;
        retryHandle = scheduleRef.current(() => {
          retryHandle = null;
          start();
        }, delayMs);
      });
    };

    const resume = (refresh: boolean) => {
      if (!canStreamNow()) return;
      retryIndex = 0;
      if (refresh) void runGap();
      start();
    };

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") {
        pause(true);
        return;
      }
      lastVisibilityRefreshAt = nowMsRef.current();
      resume(true);
    };
    const handleOffline = () => pause(true);
    const handleOnline = () => resume(true);
    const handleFocus = () => {
      if (!canStreamNow()) return;
      if (nowMsRef.current() - lastVisibilityRefreshAt > ACTIVATION_REFRESH_COALESCE_MS) {
        void runGap();
      }
      if (localStatus === "disconnected") {
        pause(false);
        retryIndex = 0;
        start();
      }
    };
    const reconnect = () => {
      if (!canStreamNow()) return;
      pause(false);
      retryIndex = 0;
      void runGap();
      start();
    };

    reconnectRef.current = reconnect;
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocus);
    start();

    return () => {
      disposed = true;
      reconnectRef.current = () => {};
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
      pause(false);
    };
  }, [options.enabled, options.identity]);

  const reconnect = useCallback(() => reconnectRef.current(), []);
  return { status, reconnect };
}
