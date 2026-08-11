const SEGMENTATION_MIN_COMPONENT_RATIO = 0.015;

export function erodeMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const output = new Uint8Array(mask.length);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let keep = 1;
      for (let oy = -1; oy <= 1 && keep; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          if (mask[(y + oy) * width + (x + ox)] === 0) {
            keep = 0;
            break;
          }
        }
      }
      output[y * width + x] = keep;
    }
  }

  return output;
}

export function dilateMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const output = new Uint8Array(mask.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let hit = 0;
      for (let oy = -1; oy <= 1 && !hit; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const nx = x + ox;
          const ny = y + oy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (mask[ny * width + nx] === 1) {
            hit = 1;
            break;
          }
        }
      }
      output[y * width + x] = hit;
    }
  }

  return output;
}

export function cleanMaskWithMorphology(mask: Uint8Array, width: number, height: number): Uint8Array {
  const opened = dilateMask(erodeMask(mask, width, height), width, height);
  return erodeMask(dilateMask(opened, width, height), width, height);
}

export function selectBestCentralComponent(
  mask: Uint8Array,
  width: number,
  height: number
): Uint8Array | null {
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const queue = new Int32Array(totalPixels);
  const componentPixels = new Int32Array(totalPixels);
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestSize = 0;
  let bestPixels: Int32Array | null = null;

  for (let start = 0; start < totalPixels; start++) {
    if (mask[start] === 0 || visited[start] === 1) continue;
    let head = 0;
    let tail = 0;
    let componentCount = 0;
    let sumX = 0;
    let sumY = 0;
    queue[tail++] = start;
    visited[start] = 1;

    while (head < tail) {
      const index = queue[head++];
      componentPixels[componentCount++] = index;
      const x = index % width;
      const y = Math.floor(index / width);
      sumX += x;
      sumY += y;
      const neighbors = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor >= 0 && mask[neighbor] === 1 && visited[neighbor] === 0) {
          visited[neighbor] = 1;
          queue[tail++] = neighbor;
        }
      }
    }

    if (componentCount === 0) continue;
    const centroidX = sumX / componentCount;
    const centroidY = sumY / componentCount;
    const dx = centroidX - centerX;
    const dy = centroidY - centerY;
    const distancePenalty = (dx * dx + dy * dy) / (width * width + height * height);
    const areaRatio = componentCount / totalPixels;
    const score = areaRatio * 2 - distancePenalty;

    if (score > bestScore) {
      bestScore = score;
      bestSize = componentCount;
      bestPixels = componentPixels.slice(0, componentCount);
    }
  }

  if (!bestPixels || bestSize < totalPixels * SEGMENTATION_MIN_COMPONENT_RATIO) return null;
  const bestMask = new Uint8Array(totalPixels);
  for (const pixel of bestPixels) bestMask[pixel] = 1;
  return bestMask;
}
