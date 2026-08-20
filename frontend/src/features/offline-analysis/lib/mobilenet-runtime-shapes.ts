import type { FreshnessClassification } from "@/entities/inspection";
import {
  normalizeClassificationLabel,
  type MeatLensModelMetadata,
} from "./meat-lens-pipeline";
import type { MobileNetOnnxSession } from "./mobilenet-session";

export interface InputLayout {
  inputName: string;
  channelsFirst: boolean;
  width: number;
  height: number;
}

interface NodeMetadataLike {
  shape?: ReadonlyArray<number | string>;
  dimensions?: unknown[];
  dims?: unknown[];
}

interface SessionMetadataShape {
  inputMetadata?: Record<string, NodeMetadataLike> | NodeMetadataLike[];
  outputMetadata?: Record<string, NodeMetadataLike> | NodeMetadataLike[];
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeDimension(value: unknown, fallback: number): number {
  if (isPositiveNumber(value)) return Math.round(value);
  if (typeof value === "bigint" && value > 0n) return Number(value);
  return fallback;
}

function resolveMetadataEntry(
  metadata: Record<string, NodeMetadataLike> | NodeMetadataLike[] | undefined,
  preferredName?: string,
): NodeMetadataLike | undefined {
  if (!metadata) return undefined;
  if (Array.isArray(metadata)) return metadata[0];
  if (preferredName && metadata[preferredName]) return metadata[preferredName];
  const firstKey = Object.keys(metadata)[0];
  return firstKey ? metadata[firstKey] : undefined;
}

function resolveMetadataDims(metadata: NodeMetadataLike | undefined): ReadonlyArray<number | string> {
  if (!metadata) return [];
  if (Array.isArray(metadata.shape)) return metadata.shape;
  if (Array.isArray(metadata.dimensions)) return metadata.dimensions as ReadonlyArray<number | string>;
  if (Array.isArray(metadata.dims)) return metadata.dims as ReadonlyArray<number | string>;
  return [];
}

export function deriveInputLayout(activeSession: MobileNetOnnxSession, fallbackSize: number): InputLayout {
  const inputName = activeSession.inputNames?.[0];
  if (!inputName) throw new Error("ONNX model has no input tensor.");
  const sessionMetadata = activeSession as unknown as SessionMetadataShape;
  const dims = resolveMetadataDims(resolveMetadataEntry(sessionMetadata.inputMetadata, inputName));
  if (dims.length < 4) return { inputName, channelsFirst: true, width: fallbackSize, height: fallbackSize };
  const d1 = normalizeDimension(dims[1], fallbackSize);
  const d2 = normalizeDimension(dims[2], fallbackSize);
  const d3 = normalizeDimension(dims[3], fallbackSize);
  if (d1 === 3) return { inputName, channelsFirst: true, height: d2, width: d3 };
  if (d3 === 3) return { inputName, channelsFirst: false, height: d1, width: d2 };
  return { inputName, channelsFirst: true, width: d3, height: d2 };
}

export function deriveOutputClassCount(activeSession: MobileNetOnnxSession): number | null {
  const metadata = activeSession as unknown as SessionMetadataShape;
  const outputName = activeSession.outputNames?.[0];
  const dims = resolveMetadataDims(resolveMetadataEntry(metadata.outputMetadata, outputName));
  if (dims.length === 0) return null;
  const classCount = normalizeDimension(dims[dims.length - 1], -1);
  return classCount > 0 ? classCount : null;
}

const LEGACY_ALLOWED_LABELS = new Set<FreshnessClassification>([
  "fresh", "not fresh", "spoiled", "acceptable", "warning",
]);

export function parseExplicitClassLabels(raw: string): FreshnessClassification[] | null {
  if (!raw) return null;
  const parsed = raw.split(",").map((value) => normalizeClassificationLabel(value)).filter(Boolean);
  if (parsed.length === 0 || !parsed.every((label) => LEGACY_ALLOWED_LABELS.has(label))) return null;
  return parsed;
}

export function sanitizeModelMetadata(
  payload: unknown,
  defaultMetadata: MeatLensModelMetadata,
): MeatLensModelMetadata {
  if (!payload || typeof payload !== "object") return { ...defaultMetadata };
  const candidate = payload as Record<string, unknown>;
  const labelOrder = Array.isArray(candidate.label_order)
    ? candidate.label_order.map((value) => normalizeClassificationLabel(String(value)))
    : undefined;
  return {
    backbone: typeof candidate.backbone === "string" ? candidate.backbone : defaultMetadata.backbone,
    preprocess_function_name: typeof candidate.preprocess_function_name === "string"
      ? candidate.preprocess_function_name : defaultMetadata.preprocess_function_name,
    input_size: typeof candidate.input_size === "number" || Array.isArray(candidate.input_size)
      ? candidate.input_size as MeatLensModelMetadata["input_size"] : defaultMetadata.input_size,
    image_crop_mode: typeof candidate.image_crop_mode === "string"
      ? candidate.image_crop_mode : defaultMetadata.image_crop_mode,
    label_order: labelOrder && labelOrder.length > 0 ? labelOrder : defaultMetadata.label_order,
  };
}
