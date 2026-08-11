export type ModelPreprocessMode = "mobilenet_v3" | "efficientnet" | "resnet50" | "identity";

const RESNET_MEAN_BGR = { b: 103.939, g: 116.779, r: 123.68 };

export function preprocessRgbPixel(
  pixel: { r: number; g: number; b: number },
  preprocessMode: ModelPreprocessMode
): [number, number, number] {
  switch (preprocessMode) {
    case "mobilenet_v3":
      return [pixel.r / 127.5 - 1, pixel.g / 127.5 - 1, pixel.b / 127.5 - 1];
    case "efficientnet":
      return [pixel.r, pixel.g, pixel.b];
    case "resnet50":
      return [pixel.b - RESNET_MEAN_BGR.b, pixel.g - RESNET_MEAN_BGR.g, pixel.r - RESNET_MEAN_BGR.r];
    case "identity":
    default:
      return [pixel.r, pixel.g, pixel.b];
  }
}

export function buildImageTensorData(
  imageData: ImageData,
  channelsFirst: boolean,
  preprocessMode: ModelPreprocessMode
): Float32Array {
  const pixels = imageData.data;
  const pixelCount = imageData.width * imageData.height;

  if (channelsFirst) {
    const channelSize = pixelCount;
    const output = new Float32Array(3 * channelSize);
    for (let index = 0; index < pixelCount; index++) {
      const offset = index * 4;
      const [c0, c1, c2] = preprocessRgbPixel(
        { r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] },
        preprocessMode
      );
      output[index] = c0;
      output[channelSize + index] = c1;
      output[channelSize * 2 + index] = c2;
    }
    return output;
  }

  const output = new Float32Array(pixelCount * 3);
  for (let index = 0; index < pixelCount; index++) {
    const offset = index * 4;
    const [c0, c1, c2] = preprocessRgbPixel(
      { r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] },
      preprocessMode
    );
    const outputOffset = index * 3;
    output[outputOffset] = c0;
    output[outputOffset + 1] = c1;
    output[outputOffset + 2] = c2;
  }
  return output;
}
