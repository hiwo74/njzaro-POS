import { Router } from "express";
import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { ZipArchive } from "archiver";
import { db } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";
import { uploadsDir } from "../lib/uploads.js";

export const settingsRouter = Router();

export const DEFAULT_SETTINGS: Record<string, string> = {
  shopName: "Njzaro Perfumes",
  shopAddress: "",
  receiptMessage: "Thank you for your purchase!",
  receiptQrUrl: "",
};

async function getAllSettings() {
  const rows = await db.setting.findMany();
  const map: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const row of rows) map[row.key] = row.value;
  return map;
}

settingsRouter.use(requireAuth);

settingsRouter.get("/", async (_req, res) => {
  res.json(await getAllSettings());
});

settingsRouter.put("/", requireAdmin, async (req, res) => {
  const updates = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(updates)) {
    await db.setting.upsert({
      where: { key },
      create: { key, value: String(value) },
      update: { value: String(value) },
    });
  }
  res.json(await getAllSettings());
});

settingsRouter.get("/backup", requireAdmin, async (_req, res) => {
  const tempDbPath = path.join(os.tmpdir(), `njzaro-backup-${crypto.randomUUID()}.db`);
  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    fs.unlink(tempDbPath, () => {});
  };

  try {
    // VACUUM INTO writes a clean, consistent snapshot even if the live
    // database is being written to concurrently — a raw file copy risks
    // grabbing it mid-write.
    await db.$executeRawUnsafe(`VACUUM INTO '${tempDbPath.replace(/'/g, "''")}'`);

    const filename = `njzaro-backup-${new Date().toISOString().slice(0, 10)}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });
    archive.on("error", (err: Error) => {
      cleanup();
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      } else {
        res.end();
      }
    });
    // The temp file is only safe to delete once the response has fully
    // flushed — finalize() can resolve before the underlying stream drains.
    res.on("finish", cleanup);
    res.on("close", cleanup);

    archive.pipe(res);
    archive.file(tempDbPath, { name: "database.db" });
    if (fs.existsSync(uploadsDir)) {
      archive.directory(uploadsDir, "uploads");
    }

    await archive.finalize();
  } catch (err) {
    cleanup();
    if (!res.headersSent) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Backup failed" });
    }
  }
});
