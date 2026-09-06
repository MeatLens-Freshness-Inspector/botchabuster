import multer from "multer";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "path";
import { Config } from "../config";
import type { DecodedTransportFile } from "../modules/transport/domain/transport";

const config = Config.getInstance();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images are allowed"));
    }
  },
});

export interface MaterializedTransportFile {
  path: string;
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
}

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/octet-stream": ".zip",
};

export async function materializeTransportFile(
  file: DecodedTransportFile,
  options: { maxBytes: number; allowedMimeTypes: readonly string[] },
): Promise<MaterializedTransportFile> {
  if (!options.allowedMimeTypes.includes(file.mimeType)) {
    throw new Error("Only supported upload types are allowed");
  }
  if (file.size !== file.bytes.length || file.size > options.maxBytes) {
    throw new Error("Uploaded file exceeds the maximum allowed size");
  }
  if (!file.fieldName || !file.fileName || file.size < 0) {
    throw new Error("Invalid uploaded file");
  }

  const extension = EXTENSION_BY_MIME_TYPE[file.mimeType] ?? ".bin";
  const filePath = path.join(config.uploadDir, `${randomUUID()}${extension}`);
  await writeFile(filePath, file.bytes, { flag: "wx", mode: 0o600 });
  return {
    path: filePath,
    fieldname: file.fieldName,
    originalname: file.fileName,
    mimetype: file.mimeType,
    size: file.size,
  };
}
