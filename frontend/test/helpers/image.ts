import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Page } from "@playwright/test";

const helperFilePath = fileURLToPath(import.meta.url);
const helperDir = dirname(helperFilePath);
const DEFAULT_SAMPLE_IMAGE_PATH = [
  resolve(helperDir, "../../../backend/uploads/1777603520236-92490810.jpg"),
  resolve(helperDir, "../../../../../backend/uploads/1777603520236-92490810.jpg"),
  fileURLToPath(new URL("../../public/android-chrome-512x512.png", import.meta.url)),
].find((candidate) => existsSync(candidate)) as string;

export async function uploadSamplePhoto(page: Page): Promise<void> {
  const fileUploadInput = page.locator('input[type="file"]:not([capture])');
  if (await fileUploadInput.count()) {
    await fileUploadInput.setInputFiles(DEFAULT_SAMPLE_IMAGE_PATH);
    return;
  }

  await page.locator('input[type="file"][capture="environment"]').setInputFiles(DEFAULT_SAMPLE_IMAGE_PATH);
}
