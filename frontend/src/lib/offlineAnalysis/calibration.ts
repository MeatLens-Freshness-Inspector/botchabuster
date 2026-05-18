import { saveCalibration, loadCalibration, type StoredCalibration } from "./calibrationStore";

export type { StoredCalibration };
export { loadCalibration, saveCalibration };

export interface CalibrationResult {
  success: boolean;
  correctionMatrix: [number, number, number];
  whitePoint: { r: number; g: number; b: number };
}

function imageToCanvas(
  imageFile: File,
  maxDim = 480
): Promise<{ ctx: CanvasRenderingContext2D; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(imageFile);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
      const width = Math.round(image.width * scale);
      const height = Math.round(image.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Unable to create 2D canvas context."));
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      resolve({ ctx, width, height });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for calibration."));
    };
    image.src = url;
  });
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  const v = max * 100;
  const s = max === 0 ? 0 : (delta / max) * 100;
  let h = 0;

  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
    if (h < 0) h += 360;
  }

  return [h, s, v];
}

function detectCardRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } | null {
  const gridSize = 32;
  const cellW = width / gridSize;
  const cellH = height / gridSize;
  const grid = new Uint8Array(gridSize * gridSize);

  for (let cy = 0; cy < gridSize; cy++) {
    for (let cx = 0; cx < gridSize; cx++) {
      const x0 = Math.floor(cx * cellW);
      const x1 = Math.floor((cx + 1) * cellW);
      const y0 = Math.floor(cy * cellH);
      const y1 = Math.floor((cy + 1) * cellH);

      let whitePixels = 0;
      let totalPixels = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const index = (y * width + x) * 4;
          const [, s, v] = rgbToHsv(data[index], data[index + 1], data[index + 2]);
          if (s <= 50 && v >= 70) {
            whitePixels++;
          }
          totalPixels++;
        }
      }

      grid[cy * gridSize + cx] = whitePixels / totalPixels >= 0.5 ? 1 : 0;
    }
  }

  const heights = new Int32Array(gridSize);
  let best: { x: number; y: number; w: number; h: number; area: number } | null = null;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      heights[col] = grid[row * gridSize + col] === 1 ? heights[col] + 1 : 0;
    }

    const stack: number[] = [];
    for (let i = 0; i <= gridSize; i++) {
      const heightValue = i < gridSize ? heights[i] : 0;
      while (stack.length && heights[stack[stack.length - 1]] > heightValue) {
        const top = stack.pop();
        if (top === undefined) {
          continue;
        }

        const heightAtTop = heights[top];
        const widthAtTop = stack.length ? i - stack[stack.length - 1] - 1 : i;
        const area = heightAtTop * widthAtTop;
        if (!best || area > best.area) {
          const left = stack.length ? stack[stack.length - 1] + 1 : 0;
          best = { x: left, y: row - heightAtTop + 1, w: widthAtTop, h: heightAtTop, area };
        }
      }
      stack.push(i);
    }
  }

  if (!best) return null;

  const px = Math.floor(best.x * cellW);
  const py = Math.floor(best.y * cellH);
  const pw = Math.floor(best.w * cellW);
  const ph = Math.floor(best.h * cellH);

  const area = pw * ph;
  const imageArea = width * height;
  const ratio = pw / Math.max(ph, 1);
  if (area < imageArea * 0.01 || area > imageArea * 0.4) return null;
  if (ratio < 0.4 || ratio > 2.5) return null;

  return { x: px, y: py, w: pw, h: ph };
}

export async function calibrateFromImage(imageFile: File): Promise<CalibrationResult> {
  const { ctx, width, height } = await imageToCanvas(imageFile, 480);
  const { data } = ctx.getImageData(0, 0, width, height);

  const region = detectCardRegion(data, width, height);
  if (!region) {
    throw new Error(
      "No white calibration card detected. Make sure a white/light-gray card is clearly visible in frame."
    );
  }

  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let count = 0;
  for (let y = region.y; y < region.y + region.h; y++) {
    for (let x = region.x; x < region.x + region.w; x++) {
      const i = (y * width + x) * 4;
      sumR += data[i];
      sumG += data[i + 1];
      sumB += data[i + 2];
      count++;
    }
  }

  const meanR = Math.max(sumR / count, 1);
  const meanG = Math.max(sumG / count, 1);
  const meanB = Math.max(sumB / count, 1);

  const matrix: [number, number, number] = [
    Math.min(255 / meanR, 4),
    Math.min(255 / meanG, 4),
    Math.min(255 / meanB, 4),
  ];
  await saveCalibration(matrix);

  return {
    success: true,
    correctionMatrix: matrix,
    whitePoint: {
      r: Math.round(meanR),
      g: Math.round(meanG),
      b: Math.round(meanB),
    },
  };
}

export function applyCalibrationToPixels(
  data: Uint8ClampedArray,
  matrix: [number, number, number],
): void {
  const [rScale, gScale, bScale] = matrix;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(Math.round(data[i] * rScale), 255);
    data[i + 1] = Math.min(Math.round(data[i + 1] * gScale), 255);
    data[i + 2] = Math.min(Math.round(data[i + 2] * bScale), 255);
  }
}
