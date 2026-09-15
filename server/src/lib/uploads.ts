import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";

export const uploadsDir = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const uploadProductImage = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const ext = ALLOWED_MIME_TO_EXT[file.mimetype] ?? "";
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TO_EXT[file.mimetype]) {
      cb(new Error("Only JPEG, PNG, or WEBP images are allowed"));
      return;
    }
    cb(null, true);
  },
});
