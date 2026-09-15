import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";

export const decantsRouter = Router();

decantsRouter.use(requireAuth);

const SOURCE_SELECT = { id: true, name: true, brand: true, imageUrl: true } as const;

// Decants are plain Products (isDecant: true) with their own price/SKU, but no
// stock of their own — they're poured on demand from the original bottle, so
// /api/sales never checks or deducts stock for them. sourceProductId is only
// used here to group them under the perfume they came from.
decantsRouter.get("/", async (req, res) => {
  const { sourceProductId, activeOnly } = req.query as Record<string, string | undefined>;

  const decants = await db.product.findMany({
    where: {
      isDecant: true,
      ...(sourceProductId ? { sourceProductId } : {}),
      ...(activeOnly === "true" ? { active: true } : {}),
    },
    include: { sourceProduct: { select: SOURCE_SELECT } },
    orderBy: [{ createdAt: "desc" }],
  });
  res.json(decants);
});

const bulkCreateSchema = z.object({
  sourceProductId: z.string().min(1),
  decants: z
    .array(
      z.object({
        decantMl: z.number().positive(),
        sellPriceIqd: z.number().nonnegative(),
        costPriceIqd: z.number().nonnegative().default(0),
        sku: z.string().optional().nullable(),
      })
    )
    .min(1),
});

decantsRouter.post("/bulk", requireAdmin, async (req, res) => {
  const parsed = bulkCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { sourceProductId, decants } = parsed.data;

  const source = await db.product.findUnique({ where: { id: sourceProductId } });
  if (!source) {
    return res.status(404).json({ error: "Source product not found" });
  }
  if (source.isDecant) {
    return res.status(400).json({ error: "Cannot create a decant from another decant" });
  }

  try {
    const created = await db.$transaction(
      decants.map((d) =>
        db.product.create({
          data: {
            name: source.name,
            brand: source.brand,
            category: source.category,
            type: source.type,
            size: `${d.decantMl}ml`,
            sku: d.sku || null,
            sellPriceIqd: d.sellPriceIqd,
            costPriceIqd: d.costPriceIqd,
            imageUrl: source.imageUrl,
            isDecant: true,
            decantMl: d.decantMl,
            sourceProductId: source.id,
          },
        })
      )
    );
    res.status(201).json(created);
  } catch (err) {
    const message =
      err instanceof Error && /Unique constraint/i.test(err.message)
        ? "One of the SKUs you entered is already in use"
        : "Failed to create decants";
    res.status(400).json({ error: message });
  }
});
