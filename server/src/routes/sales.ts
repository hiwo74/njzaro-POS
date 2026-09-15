import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const salesRouter = Router();

salesRouter.use(requireAuth);

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string(), qty: z.number().int().positive() })).min(1),
  discountIqd: z.number().nonnegative().default(0),
  amountPaid: z.number().nonnegative(),
});

salesRouter.post("/", async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { items, discountIqd, amountPaid } = parsed.data;

  try {
    const sale = await db.$transaction(async (tx) => {
      const productIds = items.map((i) => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      let subtotalIqd = 0;
      const lineItems: { productId: string; nameSnapshot: string; priceIqdSnapshot: number; costIqdSnapshot: number; qty: number; lineTotalIqd: number }[] = [];

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product || !product.active) {
          throw new Error(`Product ${item.productId} not found`);
        }
        if (product.stock < item.qty) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }
        const lineTotalIqd = product.sellPriceIqd * item.qty;
        subtotalIqd += lineTotalIqd;
        lineItems.push({
          productId: product.id,
          nameSnapshot: `${product.brand} ${product.name} (${product.size})`,
          priceIqdSnapshot: product.sellPriceIqd,
          costIqdSnapshot: product.costPriceIqd,
          qty: item.qty,
          lineTotalIqd,
        });
      }

      const totalIqd = Math.max(0, subtotalIqd - discountIqd);

      if (amountPaid + 0.5 < totalIqd) {
        throw new Error("Amount paid is less than the total due");
      }
      const changeGiven = amountPaid - totalIqd;

      const createdSale = await tx.sale.create({
        data: {
          cashierId: req.user!.userId,
          subtotalIqd,
          discountIqd,
          totalIqd,
          amountPaid,
          changeGiven,
          items: { create: lineItems },
        },
        include: { items: true, cashier: { select: { name: true, username: true } } },
      });

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });
      }

      return createdSale;
    });

    res.status(201).json(sale);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Checkout failed" });
  }
});

salesRouter.get("/", async (req, res) => {
  const isAdmin = req.user!.role === "ADMIN";
  const { from, to, cashierId, status } = req.query as Record<string, string | undefined>;

  const toDate = to ? new Date(to) : undefined;
  if (toDate) toDate.setHours(23, 59, 59, 999);

  const sales = await db.sale.findMany({
    where: {
      ...(isAdmin ? {} : { cashierId: req.user!.userId }),
      ...(isAdmin && cashierId ? { cashierId } : {}),
      ...(status ? { status } : {}),
      ...(from || toDate ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
    },
    include: { items: true, cashier: { select: { name: true, username: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json(sales);
});

salesRouter.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const sale = await db.sale.findUnique({
    where: { id },
    include: { items: true, cashier: { select: { name: true, username: true } } },
  });
  if (!sale) return res.status(404).json({ error: "Sale not found" });
  if (req.user!.role !== "ADMIN" && sale.cashierId !== req.user!.userId) {
    return res.status(403).json({ error: "Not allowed" });
  }
  res.json(sale);
});

salesRouter.post("/:id/refund", async (req, res) => {
  const id = Number(req.params.id);
  try {
    const result = await db.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({ where: { id }, include: { items: true } });
      if (!sale) throw new Error("Sale not found");
      if (sale.status === "REFUNDED") throw new Error("Sale already refunded");

      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.qty } },
        });
      }

      return tx.sale.update({ where: { id }, data: { status: "REFUNDED" }, include: { items: true } });
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Refund failed" });
  }
});
