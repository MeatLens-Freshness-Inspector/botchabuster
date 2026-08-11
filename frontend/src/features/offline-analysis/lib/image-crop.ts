export interface SquareGuideBox {
  x: number;
  y: number;
  size: number;
  normalized?: boolean;
}

export interface SquareCropRegion {
  left: number;
  top: number;
  side: number;
}

interface CenteredObjectCoverGuideBoxOptions {
  sourceWidth: number;
  sourceHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  overlayWidthRatio: number;
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Converts an object-cover overlay into normalized source-image coordinates. */
export function resolveCenteredObjectCoverGuideBox({
  sourceWidth,
  sourceHeight,
  viewportWidth,
  viewportHeight,
  overlayWidthRatio,
}: CenteredObjectCoverGuideBoxOptions): SquareGuideBox {
  const safeSourceWidth = Math.max(1, sourceWidth);
  const safeSourceHeight = Math.max(1, sourceHeight);
  const safeViewportWidth = Math.max(1, viewportWidth);
  const safeViewportHeight = Math.max(1, viewportHeight);
  const safeOverlayRatio = clamp(overlayWidthRatio, 0.01, 1);

  const coverScale = Math.max(
    safeViewportWidth / safeSourceWidth,
    safeViewportHeight / safeSourceHeight
  );
  const renderedWidth = safeSourceWidth * coverScale;
  const renderedHeight = safeSourceHeight * coverScale;
  const horizontalCrop = (renderedWidth - safeViewportWidth) / 2;
  const verticalCrop = (renderedHeight - safeViewportHeight) / 2;
  const overlaySideInViewport = safeViewportWidth * safeOverlayRatio;
  const overlayLeftInViewport = (safeViewportWidth - overlaySideInViewport) / 2;
  const overlayTopInViewport = (safeViewportHeight - overlaySideInViewport) / 2;
  const projectedSide = overlaySideInViewport / coverScale;
  const sourceMinSide = Math.min(safeSourceWidth, safeSourceHeight);
  const clampedSide = clamp(projectedSide, 1, sourceMinSide);
  const projectedLeft = (overlayLeftInViewport + horizontalCrop) / coverScale;
  const projectedTop = (overlayTopInViewport + verticalCrop) / coverScale;
  const clampedLeft = clamp(projectedLeft, 0, safeSourceWidth - clampedSide);
  const clampedTop = clamp(projectedTop, 0, safeSourceHeight - clampedSide);

  return {
    x: clampedLeft / safeSourceWidth,
    y: clampedTop / safeSourceHeight,
    size: clampedSide / sourceMinSide,
    normalized: true,
  };
}

export function resolveSquareCropRegion(
  imageWidth: number,
  imageHeight: number,
  guideBox?: SquareGuideBox | null
): SquareCropRegion {
  const safeWidth = Math.max(1, Math.round(imageWidth));
  const safeHeight = Math.max(1, Math.round(imageHeight));
  const fallbackSide = Math.min(safeWidth, safeHeight);
  const fallbackLeft = Math.round((safeWidth - fallbackSide) / 2);
  const fallbackTop = Math.round((safeHeight - fallbackSide) / 2);

  if (!guideBox || !isFinitePositive(guideBox.size)) {
    return { left: fallbackLeft, top: fallbackTop, side: fallbackSide };
  }

  const minSide = Math.min(safeWidth, safeHeight);
  const requestedSide = guideBox.normalized ? guideBox.size * minSide : guideBox.size;
  const side = Math.round(clamp(requestedSide, 1, minSide));
  const requestedLeft = guideBox.normalized ? guideBox.x * safeWidth : guideBox.x;
  const requestedTop = guideBox.normalized ? guideBox.y * safeHeight : guideBox.y;
  const left = Math.round(clamp(requestedLeft, 0, safeWidth - side));
  const top = Math.round(clamp(requestedTop, 0, safeHeight - side));

  return { left, top, side };
}
