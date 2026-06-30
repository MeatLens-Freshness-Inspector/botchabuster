import {
  validateImageQuality,
  type ImageQualityResult,
} from "../../lib/imageQuality";

interface ImageQualityTestWindow extends Window {
  __mockImageQualityResult?: ImageQualityResult;
}

function getImageQualityTestSeam(): ImageQualityResult | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (window as ImageQualityTestWindow).__mockImageQualityResult;
}

export function resolveCanvasImageQuality(canvas: HTMLCanvasElement): ImageQualityResult {
  const testSeam = getImageQualityTestSeam();
  if (testSeam !== undefined) {
    return testSeam;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      status: "pass",
      issues: [],
      metrics: { width: canvas.width, height: canvas.height },
      canProceed: true,
    };
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return validateImageQuality(imageData, canvas.width, canvas.height);
}

export async function resolveFileImageQuality(file: File): Promise<ImageQualityResult | null> {
  const testSeam = getImageQualityTestSeam();
  if (testSeam !== undefined) {
    return testSeam;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const offscreen = new OffscreenCanvas(width, height);
    const ctx = offscreen.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const imageData = ctx.getImageData(0, 0, width, height);
    return validateImageQuality(imageData, width, height);
  } catch {
    return null;
  }
}

export function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to render model-input preview."));
    reader.readAsDataURL(blob);
  });
}
