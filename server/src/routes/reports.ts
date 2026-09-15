import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { requireAuth, requireAdmin } from "../middleware/requireAuth.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireAdmin);

type SaleWithItems = Awaited<ReturnType<typeof fetchSales>>[number];

async function fetchSales(where: { createdAt?: { gte?: Date; lte?: Date } }) {
  return db.sale.findMany({
    where: { ...where, status: "COMPLETED" },
    include: {
      items: { include: { product: true } },
      cashier: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

function computeStats(sales: SaleWithItems[]) {
  const revenueIqd = sales.reduce((sum, s) => sum + s.totalIqd, 0);
  const saleCount = sales.length;
  const itemsSold = sales.reduce((sum, s) => sum + s.items.reduce((n, i) => n + i.qty, 0), 0);

  const productTotals = new Map<string, { productId: string; name: string; brand: string; qty: number; revenueIqd: number; profitIqd: number }>();
  const brandTotals = new Map<string, { brand: string; qty: number; revenueIqd: number; profitIqd: number }>();
  const typeTotals = new Map<string, { type: string; qty: number; revenueIqd: number; profitIqd: number }>();

  let costIqd = 0;

  for (const sale of sales) {
    for (const item of sale.items) {
      const brand = item.product?.brand ?? "Unknown";
      const type = item.product?.type ?? "Unknown";
      const lineCostIqd = item.costIqdSnapshot * item.qty;
      const lineProfitIqd = item.lineTotalIqd - lineCostIqd;
      costIqd += lineCostIqd;

      const p = productTotals.get(item.productId) ?? { productId: item.productId, name: item.nameSnapshot, brand, qty: 0, revenueIqd: 0, profitIqd: 0 };
      p.qty += item.qty;
      p.revenueIqd += item.lineTotalIqd;
      p.profitIqd += lineProfitIqd;
      productTotals.set(item.productId, p);

      const b = brandTotals.get(brand) ?? { brand, qty: 0, revenueIqd: 0, profitIqd: 0 };
      b.qty += item.qty;
      b.revenueIqd += item.lineTotalIqd;
      b.profitIqd += lineProfitIqd;
      brandTotals.set(brand, b);

      const t = typeTotals.get(type) ?? { type, qty: 0, revenueIqd: 0, profitIqd: 0 };
      t.qty += item.qty;
      t.revenueIqd += item.lineTotalIqd;
      t.profitIqd += lineProfitIqd;
      typeTotals.set(type, t);
    }
  }

  const topProducts = [...productTotals.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  const topProductsByProfit = [...productTotals.values()].sort((a, b) => b.profitIqd - a.profitIqd).slice(0, 5);
  const topBrands = [...brandTotals.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  const byType = [...typeTotals.values()].sort((a, b) => b.qty - a.qty);
  const profitIqd = revenueIqd - costIqd;
  const marginPct = revenueIqd > 0 ? (profitIqd / revenueIqd) * 100 : 0;

  return { revenueIqd, costIqd, profitIqd, marginPct, saleCount, itemsSold, topProducts, topProductsByProfit, topBrands, byType };
}

function computeCashierPerformance(sales: SaleWithItems[]) {
  const totals = new Map<string, { cashierId: string; name: string; username: string; revenueIqd: number; profitIqd: number; saleCount: number; itemsSold: number }>();
  for (const sale of sales) {
    const entry = totals.get(sale.cashierId) ?? {
      cashierId: sale.cashierId,
      name: sale.cashier.name,
      username: sale.cashier.username,
      revenueIqd: 0,
      profitIqd: 0,
      saleCount: 0,
      itemsSold: 0,
    };
    entry.saleCount += 1;
    entry.revenueIqd += sale.totalIqd;
    entry.itemsSold += sale.items.reduce((n, i) => n + i.qty, 0);
    entry.profitIqd += sale.items.reduce((sum, i) => sum + (i.lineTotalIqd - i.costIqdSnapshot * i.qty), 0);
    totals.set(sale.cashierId, entry);
  }
  return [...totals.values()].sort((a, b) => b.revenueIqd - a.revenueIqd);
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// Decants have no stock of their own (poured on demand from the original
// bottle), so they're excluded from stock-based reporting entirely.
reportsRouter.get("/low-stock", async (_req, res) => {
  const allActive = await db.product.findMany({ where: { active: true, isDecant: false } });
  const lowStock = allActive.filter((p) => p.stock <= p.lowStockThreshold);
  res.json({ lowStock });
});

reportsRouter.get("/overview", async (_req, res) => {
  const monthStart = daysAgo(30);
  const weekStart = daysAgo(7);
  const todayStart = startOfToday();
  const trendStart = daysAgo(13);

  const sales = await fetchSales({ createdAt: { gte: monthStart } });

  const todaySales = sales.filter((s) => s.createdAt >= todayStart);
  const weekSales = sales.filter((s) => s.createdAt >= weekStart);

  const trendMap = new Map<string, { revenueIqd: number; saleCount: number }>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(trendStart);
    d.setDate(trendStart.getDate() + i);
    trendMap.set(d.toISOString().slice(0, 10), { revenueIqd: 0, saleCount: 0 });
  }
  for (const sale of sales) {
    if (sale.createdAt < trendStart) continue;
    const key = sale.createdAt.toISOString().slice(0, 10);
    const entry = trendMap.get(key);
    if (entry) {
      entry.revenueIqd += sale.totalIqd;
      entry.saleCount += 1;
    }
  }
  const trend = [...trendMap.entries()].map(([date, v]) => ({ date, ...v }));

  const allActive = await db.product.findMany({ where: { active: true, isDecant: false } });
  const lowStock = allActive.filter((p) => p.stock <= p.lowStockThreshold);
  const inventoryValueIqd = allActive.reduce((sum, p) => sum + p.sellPriceIqd * p.stock, 0);

  res.json({
    today: computeStats(todaySales),
    week: computeStats(weekSales),
    month: computeStats(sales),
    cashierPerformance: computeCashierPerformance(sales),
    trend,
    lowStock,
    inventoryValueIqd,
    productCount: allActive.length,
  });
});

const rangeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

reportsRouter.get("/range", async (req, res) => {
  const parsed = rangeSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "from and to date parameters are required" });
  }
  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);
  to.setHours(23, 59, 59, 999);
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
    return res.status(400).json({ error: "Invalid date range" });
  }

  const sales = await fetchSales({ createdAt: { gte: from, lte: to } });
  res.json({
    ...computeStats(sales),
    cashierPerformance: computeCashierPerformance(sales),
  });
});

function csvEscape(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) lines.push(row.map(csvEscape).join(","));
  return lines.join("\n");
}

reportsRouter.get("/export/sales", async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;
  if (to) to.setHours(23, 59, 59, 999);

  const sales = await db.sale.findMany({
    where: {
      ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    },
    include: { items: true, cashier: { select: { name: true, username: true } } },
    orderBy: { createdAt: "asc" },
  });

  const rows = sales.map((s) => {
    const costIqd = s.items.reduce((sum, i) => sum + i.costIqdSnapshot * i.qty, 0);
    return [
      s.id,
      s.createdAt.toISOString(),
      s.cashier.name,
      s.items.reduce((n, i) => n + i.qty, 0),
      s.subtotalIqd,
      s.discountIqd,
      s.totalIqd,
      Math.round(costIqd),
      Math.round(s.totalIqd - costIqd),
      s.status,
    ];
  });

  const csv = toCsv(
    ["Receipt #", "Date", "Cashier", "Items", "Subtotal (IQD)", "Discount (IQD)", "Total (IQD)", "Cost (IQD)", "Profit (IQD)", "Status"],
    rows
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="sales-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

reportsRouter.get("/export/products", async (_req, res) => {
  const products = await db.product.findMany({ orderBy: [{ brand: "asc" }, { name: "asc" }] });

  const rows = products.map((p) => {
    const marginPct = p.sellPriceIqd > 0 ? ((p.sellPriceIqd - p.costPriceIqd) / p.sellPriceIqd) * 100 : 0;
    return [
      p.name,
      p.brand,
      p.category,
      p.type,
      p.size,
      p.sku ?? "",
      p.sellPriceIqd,
      p.costPriceIqd,
      marginPct.toFixed(1),
      p.stock,
      p.active ? "Active" : "Inactive",
    ];
  });

  const csv = toCsv(
    ["Name", "Brand", "Category", "Type", "Size", "SKU", "Sell Price (IQD)", "Cost Price (IQD)", "Margin %", "Stock", "Status"],
    rows
  );

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});
