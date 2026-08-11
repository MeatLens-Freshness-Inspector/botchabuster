import { resolveSquareCropRegion, type SquareGuideBox } from "./image-crop";

export interface PreprocessImageOptions {
  guideBox?: SquareGuideBox | null;
  size?: number;
  mimeType?: string;
  quality?: number;
  fileName?: string;
}

export interface ModelInputPreparationOptions extends PreprocessImageOptions {
  forceCenterCrop?: boolean;
  applySegmentation?: boolean;
}

export interface ImageSegmentationResult {
  imageData: ImageData;
  segmented: boolean;
}

export type ImageSegmenter = (imageData: ImageData) => ImageSegmentationResult;

const DEFAULT_IMAGE_INPUT_SIZE = 224;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode source image."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export preprocessed image."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

function resolveOutputExtension(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized === "image/png") return ".png";
  if (normalized === "image/webp") return ".webp";
  return ".jpg";
}

function buildCroppedResizedImageData(
  image: HTMLImageElement,
  targetSize: number,
  guideBox?: SquareGuideBox | null
): ImageData {
  const crop = resolveSquareCropRegion(image.width, image.height, guideBox);
  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create 2D canvas context.");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, crop.left, crop.top, crop.side, crop.side, 0, 0, targetSize, targetSize);
  return context.getImageData(0, 0, targetSize, targetSize);
}

async function imageDataToFile(
  imageData: ImageData,
  fileName: string,
  mimeType: string,
  quality: number
): Promise<File> {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to create 2D canvas context.");
  context.putImageData(imageData, 0, 0);
  const blob = await canvasToBlob(canvas, mimeType, quality);
  return new File([blob], fileName, { type: mimeType, lastModified: Date.now() });
}

export async function createModelInputImageFile(
  imageFile: File,
  options: ModelInputPreparationOptions = {},
  segmenter?: ImageSegmenter
): Promise<{ file: File; segmentationApplied: boolean }> {
  const targetSize = Math.max(1, Math.round(options.size ?? DEFAULT_IMAGE_INPUT_SIZE));
  const mimeType = options.mimeType ?? "image/jpeg";
  const quality = clamp(options.quality ?? 0.92, 0, 1);
  const cropGuideBox = options.forceCenterCrop ? null : (options.guideBox ?? null);
  const image = await loadImageElement(imageFile);
  const croppedImageData = buildCroppedResizedImageData(image, targetSize, cropGuideBox);
  const segmentedResult = options.applySegmentation && segmenter
    ? segmenter(croppedImageData)
    : { imageData: croppedImageData, segmented: false };
  const outputFileName =
    options.fileName ?? `${imageFile.name.replace(/\.[^.]+$/, "")}${resolveOutputExtension(mimeType)}`;
  const outputFile = await imageDataToFile(segmentedResult.imageData, outputFileName, mimeType, quality);

  return { file: outputFile, segmentationApplied: segmentedResult.segmented };
}

export async function createCroppedResizedImageFile(
  imageFile: File,
  options: PreprocessImageOptions = {}
): Promise<File> {
  const prepared = await createModelInputImageFile(imageFile, {
    ...options,
    applySegmentation: false,
  });
  return prepared.file;
}
