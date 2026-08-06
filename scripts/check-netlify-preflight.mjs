import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const isNetlifyBuild = process.env.NETLIFY === "true" || process.env.NETLIFY === "1";
if (!isNetlifyBuild) {
  process.exit(0);
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function hasAny(paths) {
  return paths.some((candidate) => existsSync(path.join(rootDir, candidate)));
}

const apiBaseUrl = (process.env.VITE_API_BASE_URL ?? "").trim();
if (!apiBaseUrl) {
  console.error("[netlify-preflight] Missing VITE_API_BASE_URL. Set it in Netlify env vars (Build scope).");
  process.exit(1);
}

if (!/^https?:\/\//i.test(apiBaseUrl)) {
  console.error("[netlify-preflight] VITE_API_BASE_URL must be an absolute URL, e.g. https://your-backend.onrender.com/api");
  process.exit(1);
}

if (!apiBaseUrl.toLowerCase().includes("/api")) {
  console.warn("[netlify-preflight] VITE_API_BASE_URL does not include '/api'. Verify this is intentional.");
}

const modelCandidates = [
  "model/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only.onnx",
  "frontend/public/model/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only.onnx",
  "frontend/public/models/mobilenetv3_meat/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only.onnx",
  "model/meatlens_mobilenetv3small_cnn_only.onnx",
  "model/meatlens_mobilenetv3small_cnn_only (1).onnx",
  "frontend/public/model/meatlens_mobilenetv3small_cnn_only.onnx",
  "frontend/public/models/mobilenetv3_meat/meatlens_mobilenetv3small_cnn_only.onnx",
  "frontend/public/model/model2/meatlens_final_8samples_cnn_only_mobilenetv3small_seed123.onnx",
  "frontend/public/model-old/model2/meatlens_final_8samples_cnn_only_mobilenetv3small_seed123.onnx",
];

const metadataCandidates = [
  "model/NEW-meatlens_best_model_metadata.json",
  "model/NEW-meatlens_mobilenetv3small_cnn_only_metadata.json",
  "model/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata.json",
  "model/NEW-meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata (1).json",
  "frontend/public/model/NEW-meatlens_best_model_metadata.json",
  "frontend/public/models/mobilenetv3_meat/NEW-meatlens_best_model_metadata.json",
  "model/meatlens_mobilenetv3small_cnn_only_metadata.json",
  "model/meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata.json",
  "model/meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata (1).json",
  "model/meatlens_best_model_metadata.json",
  "frontend/public/model/meatlens_best_model_metadata.json",
  "frontend/public/models/mobilenetv3_meat/meatlens_best_model_metadata.json",
  "frontend/public/models/mobilenetv3_meat/meatlens_mobilenetv3small_cnn_only_metadata.json",
  "frontend/public/models/mobilenetv3_meat/meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata.json",
  "frontend/public/models/mobilenetv3_meat/meatlens_mobilenetv3small_cross_rotation_fold1_seed42_cnn_only_metadata (1).json",
  "frontend/public/model/model2/meatlens_final_8samples_cnn_only_mobilenetv3small_seed123_metadata.json",
  "frontend/public/model-old/model2/meatlens_final_8samples_cnn_only_mobilenetv3small_seed123_metadata.json",
];

if (!hasAny(modelCandidates)) {
  console.error("[netlify-preflight] MobileNetV3 ONNX file not found. Expected one of:");
  for (const candidate of modelCandidates) {
    console.error(`  - ${candidate}`);
  }
  process.exit(1);
}

if (!hasAny(metadataCandidates)) {
  console.error("[netlify-preflight] Model metadata JSON not found. Expected one of:");
  for (const candidate of metadataCandidates) {
    console.error(`  - ${candidate}`);
  }
  process.exit(1);
}

console.info("[netlify-preflight] Deployment checks passed.");
