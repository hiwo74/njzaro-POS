import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.get("/", async (req, res) => {
  const { q, category, brand, activeOnly } = req.query as Record<string, string | undefined>;

  const products = await db.product.findMany({
    where: {
      ...(activeOnly === "true" ? { active: true } : {}),
      ...(category ? { category: category as any } : {}),
      ...(brand ? { brand } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { brand: { contains: q } },
              { sku: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ brand: "asc" }, { name: "asc" }],
  });
  res.json(products);
});

const productSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.enum(["MEN", "WOMEN", "UNISEX"]),
  type: z.enum(["EDP", "EDT", "PARFUM", "ATTAR", "OIL"]),
  size: z.string().min(1),
  sku: z.string().optional().nullable(),
  sellPriceIqd: z.number().nonnegative(),
  costPriceIqd: z.number().nonnegative().default(0),
  stock: z.number().int().nonnegative().default(0),
  lowStockThreshold: z.number().int().nonnegative().default(3),
  imageUrl: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

productsRouter.post("/", requireAdmin, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const product = await db.product.create({ data: parsed.data });
  res.status(201).json(product);
});

productsRouter.put("/:id", requireAdmin, async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const product = await db.product.update({
      where: { id: req.params.id },
      data: parsed.data,
    });
    res.json(product);
  } catch {
    res.status(404).json({ error: "Product not found" });
  }
});

productsRouter.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await db.product.update({ where: { id: req.params.id }, data: { active: false } });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: "Product not found" });
  }
});

const stockSchema = z.object({
  delta: z.number().int(),
});

productsRouter.patch("/:id/stock", requireAdmin, async (req, res) => {
  const parsed = stockSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "delta (integer) is required" });
  }
  try {
    const product = await db.product.update({
      where: { id: req.params.id },
      data: { stock: { increment: parsed.data.delta } },
    });
    res.json(product);
  } catch {
    res.status(404).json({ error: "Product not found" });
  }
});
