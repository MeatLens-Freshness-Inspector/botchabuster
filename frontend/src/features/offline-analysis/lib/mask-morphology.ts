const TRAINING_COMPONENT_MIN_AREA = 200;

interface DiskOffset {
  x: number;
  y: number;
}

export interface CentralComponentSelection {
  mask: Uint8Array;
  areaRatio: number;
  centerOverlapRatio: number;
  numberOfComponents: number;
  touchesBorder: boolean;
}

function createDiskOffsets(radius: number): DiskOffset[] {
  const offsets: DiskOffset[] = [];
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      if (x * x + y * y <= radius * radius) offsets.push({ x, y });
    }
  }
  return offsets;
}

const DISK_OFFSETS = new Map<number, DiskOffset[]>();

function getDiskOffsets(radius: number): DiskOffset[] {
  const cached = DISK_OFFSETS.get(radius);
  if (cached) return cached;
  const offsets = createDiskOffsets(radius);
  DISK_OFFSETS.set(radius, offsets);
  return offsets;
}

export function erodeMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radius = 1,
): Uint8Array {
  const output = new Uint8Array(mask.length);
  const offsets = getDiskOffsets(radius);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let keep = 1;
      for (const offset of offsets) {
        const nx = x + offset.x;
        const ny = y + offset.y;
        if (
          nx < 0 ||
          nx >= width ||
          ny < 0 ||
          ny >= height ||
          mask[ny * width + nx] === 0
        ) {
          keep = 0;
          break;
        }
      }
      output[y * width + x] = keep;
    }
  }

  return output;
}

export function dilateMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radius = 1,
): Uint8Array {
  const output = new Uint8Array(mask.length);
  const offsets = getDiskOffsets(radius);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let hit = 0;
      for (const offset of offsets) {
        const nx = x + offset.x;
        const ny = y + offset.y;
        if (
          nx >= 0 &&
          nx < width &&
          ny >= 0 &&
          ny < height &&
          mask[ny * width + nx] === 1
        ) {
          hit = 1;
          break;
        }
      }
      output[y * width + x] = hit;
    }
  }

  return output;
}

function visitComponent(
  mask: Uint8Array,
  width: number,
  height: number,
  start: number,
  visited: Uint8Array,
  onPixel: (index: number) => void,
): number {
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  let count = 0;
  queue[tail++] = start;
  visited[start] = 1;

  while (head < tail) {
    const index = queue[head++];
    count += 1;
    onPixel(index);

    const x = index % width;
    const y = Math.floor(index / width);
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

  return count;
}

function removeSmallMaskObjects(
  mask: Uint8Array,
  width: number,
  height: number,
  minimumArea: number,
): Uint8Array {
  const output = new Uint8Array(mask.length);
  const visited = new Uint8Array(mask.length);

  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] === 0 || visited[start] === 1) continue;
    const pixels: number[] = [];
    const area = visitComponent(mask, width, height, start, visited, (index) => {
      pixels.push(index);
    });
    if (area >= minimumArea) {
      for (const index of pixels) output[index] = 1;
    }
  }

  return output;
}

function fillMaskHoles(mask: Uint8Array, width: number, height: number): Uint8Array {
  const output = mask.slice();
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let head = 0;
  let tail = 0;

  const enqueue = (index: number): void => {
    if (visited[index] === 1 || mask[index] === 1) return;
    visited[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    const neighbors = [
      x > 0 ? index - 1 : -1,
      x < width - 1 ? index + 1 : -1,
      y > 0 ? index - width : -1,
      y < height - 1 ? index + width : -1,
    ];
    for (const neighbor of neighbors) {
      if (neighbor >= 0) enqueue(neighbor);
    }
  }

  for (let index = 0; index < output.length; index += 1) {
    if (mask[index] === 0 && visited[index] === 0) output[index] = 1;
  }
  return output;
}

export function cleanMaskWithMorphology(
  mask: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const opened = dilateMask(erodeMask(mask, width, height, 3), width, height, 3);
  const closed = erodeMask(dilateMask(opened, width, height, 5), width, height, 5);
  return fillMaskHoles(
    removeSmallMaskObjects(closed, width, height, 250),
    width,
    height,
  );
}

export function selectBestCentralComponent(
  mask: Uint8Array,
  width: number,
  height: number,
): CentralComponentSelection | null {
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const centerRegion = new Uint8Array(totalPixels);
  const centerXStart = Math.floor(width * 0.25);
  const centerXEnd = Math.floor(width * 0.75);
  const centerYStart = Math.floor(height * 0.25);
  const centerYEnd = Math.floor(height * 0.75);
  let centerRegionArea = 0;

  for (let y = centerYStart; y < centerYEnd; y += 1) {
    for (let x = centerXStart; x < centerXEnd; x += 1) {
      centerRegion[y * width + x] = 1;
      centerRegionArea += 1;
    }
  }

  let best: CentralComponentSelection | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  let numberOfComponents = 0;

  for (let start = 0; start < totalPixels; start += 1) {
    if (mask[start] === 0 || visited[start] === 1) continue;

    const pixels: number[] = [];
    let sumX = 0;
    let sumY = 0;
    let centerOverlapPixels = 0;
    const area = visitComponent(mask, width, height, start, visited, (index) => {
      pixels.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      sumX += x;
      sumY += y;
      if (centerRegion[index] === 1) centerOverlapPixels += 1;
    });

    if (area < TRAINING_COMPONENT_MIN_AREA) continue;
    numberOfComponents += 1;

    const centroidX = sumX / area;
    const centroidY = sumY / area;
    const distance = Math.sqrt((centroidY - centerY) ** 2 + (centroidX - centerX) ** 2);
    const distanceNorm = distance / Math.max(Math.sqrt(centerY ** 2 + centerX ** 2), 1e-6);
    const areaRatio = area / totalPixels;
    const centerOverlapRatio = centerOverlapPixels / Math.max(centerRegionArea, 1);
    const score = 2 * areaRatio + 2.5 * centerOverlapRatio - 1.25 * distanceNorm;

    if (score <= bestScore) continue;
    const selectedMask = new Uint8Array(totalPixels);
    for (const index of pixels) selectedMask[index] = 1;
    const touchesBorder = pixels.some((index) => {
      const x = index % width;
      const y = Math.floor(index / width);
      return x === 0 || y === 0 || x === width - 1 || y === height - 1;
    });
    bestScore = score;
    best = {
      mask: selectedMask,
      areaRatio,
      centerOverlapRatio,
      numberOfComponents,
      touchesBorder,
    };
  }

  if (!best) return null;
  return { ...best, numberOfComponents };
}
