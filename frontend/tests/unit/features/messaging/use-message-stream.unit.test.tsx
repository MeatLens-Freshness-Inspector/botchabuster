import assert from "node:assert/strict";
import { test } from "node:test";
import React, { useEffect } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import {
  MESSAGE_STREAM_RETRY_DELAYS_MS,
  useMessageStream,
  type UseMessageStreamOptions,
} from "../../../../src/features/messaging/model/use-message-stream";
import { MessageStreamConnectionError } from "../../../../src/entities/message";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    url: "http://localhost/",
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
  };
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
  Object.defineProperty(globalThis, "window", { configurable: true, value: dom.window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: dom.window.document });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  return {
    container: document.getElementById("root")!,
    setVisible(value: boolean) {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: value ? "visible" : "hidden",
      });
      document.dispatchEvent(new window.Event("visibilitychange"));
    },
    setOnline(value: boolean) {
      Object.defineProperty(navigator, "onLine", { configurable: true, value });
      window.dispatchEvent(new window.Event(value ? "online" : "offline"));
    },
    cleanup() {
      Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: undefined });
      Object.defineProperty(globalThis, "window", { configurable: true, value: previous.window });
      Object.defineProperty(globalThis, "document", { configurable: true, value: previous.document });
      Object.defineProperty(globalThis, "navigator", { configurable: true, value: previous.navigator });
      dom.window.close();
    },
  };
}

function Harness({ options, onValue }: {
  options: UseMessageStreamOptions;
  onValue: (value: ReturnType<typeof useMessageStream>) => void;
}) {
  const value = useMessageStream(options);
  useEffect(() => onValue(value), [onValue, value]);
  return <span data-testid="status">{value.status}</span>;
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
}

test("opens only while visible and online, aborts on pause, and coalesces lifecycle refreshes", async () => {
  const dom = installDom();
  const root = createRoot(dom.container);
  const calls: Array<{ signal: AbortSignal }> = [];
  let gapCalls = 0;
  let nowMs = 1_000;
  let latest: ReturnType<typeof useMessageStream> | null = null;
  const options: UseMessageStreamOptions = {
    enabled: true,
    openStream: async ({ signal }) => {
      calls.push({ signal });
      await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }));
    },
    onMessage: () => {},
    onGap: async () => {
      gapCalls += 1;
    },
    nowMs: () => nowMs,
  };

  try {
    await act(async () => root.render(<Harness options={options} onValue={(value) => { latest = value; }} />));
    await flush();
    assert.equal(calls.length, 1);

    await act(async () => dom.setVisible(false));
    assert.equal(calls[0].signal.aborted, true);
    await act(async () => dom.setVisible(true));
    await flush();
    assert.equal(calls.length, 2);
    assert.equal(gapCalls, 1);

    await act(async () => window.dispatchEvent(new window.Event("focus")));
    await flush();
    assert.equal(calls.length, 2);
    assert.equal(gapCalls, 1);

    nowMs += 1_001;
    await act(async () => window.dispatchEvent(new window.Event("focus")));
    await flush();
    assert.equal(gapCalls, 2);

    await act(async () => dom.setOnline(false));
    assert.equal(calls[1].signal.aborted, true);
    await act(async () => dom.setOnline(true));
    await flush();
    assert.equal(calls.length, 3);
    assert.equal(gapCalls, 3);
    assert.ok(latest);
  } finally {
    await act(async () => root.unmount());
    dom.cleanup();
  }
});

test("waits for an aborted handshake to settle before opening a replacement stream", async () => {
  const dom = installDom();
  const root = createRoot(dom.container);
  const calls: Array<{ signal: AbortSignal }> = [];
  let releaseFirstHandshake!: () => void;
  let attempts = 0;
  const options: UseMessageStreamOptions = {
    enabled: true,
    openStream: async ({ signal }) => {
      attempts += 1;
      calls.push({ signal });
      if (attempts === 1) {
        await new Promise<void>((resolve) => {
          releaseFirstHandshake = resolve;
        });
      }
    },
    onMessage: () => {},
    onGap: async () => {},
  };

  try {
    await act(async () => root.render(<Harness options={options} onValue={() => {}} />));
    await flush();
    assert.equal(calls.length, 1);

    await act(async () => dom.setVisible(false));
    await act(async () => dom.setVisible(true));
    await flush();
    assert.equal(calls[0].signal.aborted, true);
    assert.equal(calls.length, 1);

    releaseFirstHandshake();
    await flush();
    assert.equal(calls.length, 2);
  } finally {
    await act(async () => root.unmount());
    dom.cleanup();
  }
});

test("serializes the handshake replay performed by React StrictMode", async () => {
  const dom = installDom();
  const root = createRoot(dom.container);
  const calls: Array<{ signal: AbortSignal }> = [];
  let releaseFirstHandshake!: () => void;
  let attempts = 0;
  const options: UseMessageStreamOptions = {
    enabled: true,
    openStream: async ({ signal }) => {
      attempts += 1;
      calls.push({ signal });
      if (attempts === 1) {
        await new Promise<void>((resolve) => {
          releaseFirstHandshake = resolve;
        });
      }
    },
    onMessage: () => {},
    onGap: async () => {},
  };

  try {
    await act(async () => root.render(
      <React.StrictMode>
        <Harness options={options} onValue={() => {}} />
      </React.StrictMode>,
    ));
    await flush();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].signal.aborted, true);

    releaseFirstHandshake();
    await flush();
    assert.equal(calls.length, 2);
  } finally {
    await act(async () => root.unmount());
    dom.cleanup();
  }
});

test("uses five bounded reconnect delays and then stops", async () => {
  const dom = installDom();
  const root = createRoot(dom.container);
  const scheduled: Array<{ delay: number; callback: () => void }> = [];
  let attempts = 0;
  const options: UseMessageStreamOptions = {
    enabled: true,
    openStream: async () => {
      attempts += 1;
      throw new Error("network down");
    },
    onMessage: () => {},
    onGap: async () => {},
    schedule(callback, delay) {
      scheduled.push({ callback, delay });
      return callback;
    },
    cancelSchedule() {},
  };

  try {
    await act(async () => root.render(<Harness options={options} onValue={() => {}} />));
    await flush();
    for (let index = 0; index < MESSAGE_STREAM_RETRY_DELAYS_MS.length; index += 1) {
      assert.equal(scheduled[index].delay, MESSAGE_STREAM_RETRY_DELAYS_MS[index]);
      await act(async () => scheduled[index].callback());
      await flush();
    }

    assert.equal(attempts, 6);
    assert.deepEqual(scheduled.map(({ delay }) => delay), [...MESSAGE_STREAM_RETRY_DELAYS_MS]);
    assert.equal(dom.container.querySelector('[data-testid="status"]')?.textContent, "disconnected");
  } finally {
    await act(async () => root.unmount());
    dom.cleanup();
  }
});

test("does not retry terminal handshake failures", async () => {
  const dom = installDom();
  const root = createRoot(dom.container);
  const scheduled: number[] = [];
  const options: UseMessageStreamOptions = {
    enabled: true,
    openStream: async () => {
      throw new MessageStreamConnectionError("capacity reached", 429, false);
    },
    onMessage: () => {},
    onGap: async () => {},
    schedule(_callback, delay) {
      scheduled.push(delay);
      return delay;
    },
    cancelSchedule() {},
  };

  try {
    await act(async () => root.render(<Harness options={options} onValue={() => {}} />));
    await flush();
    assert.deepEqual(scheduled, []);
    assert.equal(dom.container.querySelector('[data-testid="status"]')?.textContent, "disconnected");
  } finally {
    await act(async () => root.unmount());
    dom.cleanup();
  }
});

test("treats realtime_unavailable as terminal until a lifecycle or manual restart", async () => {
  const dom = installDom();
  const root = createRoot(dom.container);
  const scheduled: number[] = [];
  let attempts = 0;
  const options: UseMessageStreamOptions = {
    enabled: true,
    openStream: async ({ signal, onStatus }) => {
      attempts += 1;
      onStatus("realtime_unavailable");
      await new Promise<void>((resolve) => {
        if (signal.aborted) resolve();
        else signal.addEventListener("abort", () => resolve(), { once: true });
      });
    },
    onMessage: () => {},
    onGap: async () => {},
    schedule(_callback, delay) {
      scheduled.push(delay);
      return delay;
    },
    cancelSchedule() {},
  };

  try {
    await act(async () => root.render(<Harness options={options} onValue={() => {}} />));
    await flush();
    assert.equal(attempts, 1);
    assert.deepEqual(scheduled, []);
    assert.equal(dom.container.querySelector('[data-testid="status"]')?.textContent, "disconnected");
  } finally {
    await act(async () => root.unmount());
    dom.cleanup();
  }
});
