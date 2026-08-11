import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const publicFacadePath = new URL("../../../src/components/CameraCapture.tsx", import.meta.url);
const internalIndexPath = new URL("../../../src/components/camera/index.ts", import.meta.url);
const featureComponentPath = new URL("../../../src/features/inspection-capture/ui/camera-capture.tsx", import.meta.url);
const featureViewPath = new URL("../../../src/features/inspection-capture/ui/camera-capture-view.tsx", import.meta.url);
const featureIndexPath = new URL("../../../src/features/inspection-capture/index.ts", import.meta.url);
const internalHookPath = new URL("../../../src/features/inspection-capture/model/camera-session.ts", import.meta.url);

test("CameraCapture keeps a thin public facade while logic lives in the inspection-capture feature", async () => {
  const publicFacadeSource = await readFile(publicFacadePath, "utf8");

  assert.match(publicFacadeSource, /export\s*\{\s*CameraCapture\s*\}\s*from\s*["']\.\/camera["'];/);
  assert.match(publicFacadeSource, /export\s+type\s*\{\s*CapturedImagePayload\s*\}\s*from\s*["']\.\/camera["'];/);
  assert.doesNotMatch(publicFacadeSource, /useState|navigator\.mediaDevices|createModelInputImageFile/);

  const internalIndexSource = await readFile(internalIndexPath, "utf8");
  assert.match(internalIndexSource, /@\/features\/inspection-capture/);

  const featureIndexSource = await readFile(featureIndexPath, "utf8");
  assert.match(featureIndexSource, /export\s*\{\s*useCameraCapture\s*\}\s*from\s*["']\.\/model\/camera-session["'];/);

  const featureComponentSource = await readFile(featureComponentPath, "utf8");
  assert.match(featureComponentSource, /useCameraCapture/);
  assert.match(featureComponentSource, /camera-capture-view/);

  const featureViewSource = await readFile(featureViewPath, "utf8");
  assert.match(featureViewSource, /export\s+function\s+CameraCaptureView/);

  const internalHookSource = await readFile(internalHookPath, "utf8");
  assert.match(internalHookSource, /useState/);
  assert.match(internalHookSource, /CameraCaptureViewProps/);
});
