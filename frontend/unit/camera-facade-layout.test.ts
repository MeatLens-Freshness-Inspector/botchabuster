import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const publicFacadePath = new URL("../src/components/CameraCapture.tsx", import.meta.url);
const internalIndexPath = new URL("../src/components/camera/index.ts", import.meta.url);
const internalComponentPath = new URL("../src/components/camera/CameraCapture.tsx", import.meta.url);
const internalHookPath = new URL("../src/components/camera/useCameraCapture.ts", import.meta.url);

test("CameraCapture keeps a thin public facade while logic lives in src/components/camera", async () => {
  const publicFacadeSource = await readFile(publicFacadePath, "utf8");

  assert.match(publicFacadeSource, /export\s*\{\s*CameraCapture\s*\}\s*from\s*["']\.\/camera["'];/);
  assert.match(publicFacadeSource, /export\s+type\s*\{\s*CapturedImagePayload\s*\}\s*from\s*["']\.\/camera["'];/);
  assert.doesNotMatch(publicFacadeSource, /useState|navigator\.mediaDevices|createModelInputImageFile/);

  const internalIndexSource = await readFile(internalIndexPath, "utf8");
  assert.match(internalIndexSource, /export\s*\{\s*CameraCapture\s*\}\s*from\s*["']\.\/CameraCapture["'];/);
  assert.match(internalIndexSource, /export\s+type\s*\{\s*CapturedImagePayload\s*\}\s*from\s*["']\.\/types["'];/);
  assert.match(internalIndexSource, /export\s+type\s*\{\s*CameraCaptureProps\s*\}\s*from\s*["']\.\/types["'];/);

  const internalComponentSource = await readFile(internalComponentPath, "utf8");
  assert.match(internalComponentSource, /useCameraCapture/);
  assert.match(internalComponentSource, /CameraCaptureView/);

  const internalHookSource = await readFile(internalHookPath, "utf8");
  assert.match(internalHookSource, /useState/);
  assert.match(internalHookSource, /CameraCaptureViewProps/);
});
