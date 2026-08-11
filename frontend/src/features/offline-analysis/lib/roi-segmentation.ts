import {
  cleanMaskWithMorphology,
  selectBestCentralComponent,
} from "./mask-morphology";

const SEGMENTATION_BACKGROUND_GRAY = 127;

function toLinearRgb(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function rgbToHsv(pixel: { r: number; g: number; b: number }): { h: number; s: number; v: number } {
  const r = pixel.r / 255;
  const g = pixel.g / 255;
  const b = pixel.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
  }
  return { h: (hue * 60 + 360) % 360, s: max === 0 ? 0 : delta / max, v: max };
}

function rgbToLab(pixel: { r: number; g: number; b: number }): { l: number; a: number; b: number } {
  const r = toLinearRgb(pixel.r);
  const g = toLinearRgb(pixel.g);
  const b = toLinearRgb(pixel.b);
  const x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  const y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const z = r * 0.0193339 + g * 0.119192 + b * 0.9503041;
  const fx = x / 0.95047 > 0.008856 ? Math.cbrt(x / 0.95047) : 7.787 * (x / 0.95047) + 16 / 116;
  const fy = y > 0.008856 ? Math.cbrt(y) : 7.787 * y + 16 / 116;
  const fz = z / 1.08883 > 0.008856 ? Math.cbrt(z / 1.08883) : 7.787 * (z / 1.08883) + 16 / 116;
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function isLikelyMeatForeground(pixel: { r: number; g: number; b: number }): boolean {
  const hsv = rgbToHsv(pixel);
  const lab = rgbToLab(pixel);
  const hsvPass = hsv.v >= 0.1 && hsv.s >= 0.08 &&
    (hsv.h <= 40 || hsv.h >= 300 || (hsv.h >= 15 && hsv.h <= 75));
  const labPass = lab.l >= 12 && lab.l <= 95 && lab.a >= 2 && lab.a <= 55 && lab.b >= -8 && lab.b <= 70;
  const strongLabPass = lab.a >= 10 && lab.b >= 0 && lab.l >= 10 && lab.l <= 95;
  return (hsvPass && labPass) || strongLabPass;
}

export function applyRoiSegmentationWithFallback(
  imageData: ImageData
): { imageData: ImageData; segmented: boolean } {
  try {
    const width = imageData.width;
    const height = imageData.height;
    const totalPixels = width * height;
    const source = imageData.data;
    const rawMask = new Uint8Array(totalPixels);

    for (let index = 0; index < totalPixels; index++) {
      const offset = index * 4;
      rawMask[index] = isLikelyMeatForeground({
        r: source[offset],
        g: source[offset + 1],
        b: source[offset + 2],
      }) ? 1 : 0;
    }

    const bestMask = selectBestCentralComponent(
      cleanMaskWithMorphology(rawMask, width, height),
      width,
      height
    );
    if (!bestMask) return { imageData, segmented: false };

    const segmentedPixels = new Uint8ClampedArray(source.length);
    for (let index = 0; index < totalPixels; index++) {
      const offset = index * 4;
      if (bestMask[index] === 1) {
        segmentedPixels[offset] = source[offset];
        segmentedPixels[offset + 1] = source[offset + 1];
        segmentedPixels[offset + 2] = source[offset + 2];
      } else {
        segmentedPixels[offset] = SEGMENTATION_BACKGROUND_GRAY;
        segmentedPixels[offset + 1] = SEGMENTATION_BACKGROUND_GRAY;
        segmentedPixels[offset + 2] = SEGMENTATION_BACKGROUND_GRAY;
      }
      segmentedPixels[offset + 3] = 255;
    }

    return { imageData: new ImageData(segmentedPixels, width, height), segmented: true };
  } catch {
    return { imageData, segmented: false };
  }
}
