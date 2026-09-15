import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";
import { uploadProductImage } from "../lib/uploads.js";

export const uploadsRouter = Router();

uploadsRouter.use(requireAuth, requireAdmin);

uploadsRouter.post("/image", (req, res) => {
  uploadProductImage.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  });
});
