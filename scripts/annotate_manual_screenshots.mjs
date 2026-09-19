import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const assetDir = path.resolve("documentation", "manual-assets");
const manifestPath = path.join(assetDir, "mobile-manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function makeOverlay(width, height, markers) {
  const radius = Math.max(14, Math.min(22, Math.round(width * 0.05)));
  const strokeWidth = Math.max(2, Math.round(radius * 0.12));
  const markerSvg = markers
    .map((marker) => {
      const x = Math.max(radius + 2, Math.min(width - radius - 2, marker.x));
      const y = Math.max(radius + 2, Math.min(height - radius - 2, marker.y));
      return `
        <circle cx="${x}" cy="${y}" r="${radius + 3}" fill="#F0FDF4" fill-opacity="0.94" stroke="#166534" stroke-width="${strokeWidth}"/>
        <circle cx="${x}" cy="${y}" r="${radius}" fill="#15803D" stroke="#FFFFFF" stroke-width="${strokeWidth}"/>
        <text x="${x}" y="${y + Math.round(radius * 0.36)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.round(radius * 1.12)}" font-weight="700" fill="#FFFFFF">${escapeXml(marker.number)}</text>`;
    })
    .join("");

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${markerSvg}</svg>`,
  );
}

for (const capture of manifest) {
  const rawPath = path.join(assetDir, capture.raw);
  const outputPath = path.join(assetDir, capture.output);
  const metadata = await sharp(rawPath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Unable to read dimensions for ${capture.raw}`);
  }

  await sharp(rawPath)
    .composite([{ input: makeOverlay(metadata.width, metadata.height, capture.markers), blend: "over" }])
    .png()
    .toFile(outputPath);
}

console.log(`Annotated ${manifest.length} mobile screenshots in ${assetDir}`);
