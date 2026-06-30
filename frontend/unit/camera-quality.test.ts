import assert from "node:assert/strict";
import test from "node:test";

import {
  readBlobAsDataUrl,
  resolveCanvasImageQuality,
  resolveFileImageQuality,
} from "../src/components/camera/quality";

type MockWindow = Window & {
  __mockImageQualityResult?: unknown;
};

function installWindowMock(): MockWindow {
  const mockWindow = globalThis as typeof globalThis & MockWindow;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: mockWindow,
    writable: true,
  });
  return mockWindow;
}

test("resolveCanvasImageQuality returns the configured test seam before reading canvas pixels", () => {
  const mockResult = {
    status: "warning",
    issues: [{ code: "TEST", message: "Mocked issue", severity: "warning" }],
    metrics: { width: 10, height: 10 },
    canProceed: true,
  };
  const mockWindow = installWindowMock();
  mockWindow.__mockImageQualityResult = mockResult;

  const canvas = {
    width: 10,
    height: 10,
    getContext() {
      throw new Error("Canvas context should not be read when the test seam is active.");
    },
  } as unknown as HTMLCanvasElement;

  assert.equal(resolveCanvasImageQuality(canvas), mockResult);
});

test("resolveFileImageQuality returns the configured test seam before decoding the file", async () => {
  const mockResult = {
    status: "fail",
    issues: [{ code: "TEST", message: "Mocked fail", severity: "fail" }],
    metrics: { width: 20, height: 20 },
    canProceed: false,
  };
  const mockWindow = installWindowMock();
  mockWindow.__mockImageQualityResult = mockResult;

  Object.defineProperty(globalThis, "createImageBitmap", {
    configurable: true,
    value: async () => {
      throw new Error("createImageBitmap should not be called when the test seam is active.");
    },
    writable: true,
  });

  const file = new File([new Uint8Array([1, 2, 3])], "mock.jpg", { type: "image/jpeg" });
  const result = await resolveFileImageQuality(file);

  assert.equal(result, mockResult);
});

test("readBlobAsDataUrl resolves the FileReader result and surfaces reader failures", async () => {
  class SuccessfulFileReaderMock {
    result: string | ArrayBuffer | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    readAsDataURL() {
      this.result = "data:image/jpeg;base64,dGVzdA==";
      this.onload?.();
    }
  }

  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: SuccessfulFileReaderMock,
    writable: true,
  });

  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
  await assert.doesNotReject(async () => {
    const result = await readBlobAsDataUrl(blob);
    assert.equal(result, "data:image/jpeg;base64,dGVzdA==");
  });

  class FailingFileReaderMock {
    result: string | ArrayBuffer | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    readAsDataURL() {
      this.onerror?.();
    }
  }

  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: FailingFileReaderMock,
    writable: true,
  });

  await assert.rejects(
    () => readBlobAsDataUrl(blob),
    /Failed to render model-input preview/,
  );
});
