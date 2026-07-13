import multer from "multer";
import path from "path";
import { Config } from "../config";

const config = Config.getInstance();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname) || ".zip"}`);
  },
});

export const developerPackageUpload = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = new Set([
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream",
    ]);

    if (extension === ".zip" && allowedMimeTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error("Only ZIP training packages are allowed"));
  },
});
