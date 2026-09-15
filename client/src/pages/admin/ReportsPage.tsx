import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { api, ApiError, downloadFile } from "../../lib/api";
import { formatIqd } from "../../lib/currency";
import type { Product } from "../../lib/types";
import { StatCard } from "../../components/StatCard";
import { RankedBarList, type RankedBarItem } from "../../components/RankedBarList";
import { CATEGORICAL, CHART_INK, SEQUENTIAL_BLUE, TYPE_COLOR } from "../../lib/chartColors";
import { CalendarIcon, ClockIcon, PackageIcon, BottleIcon } from "../../components/Icons";
import { useT, useLang, localeFor } from "../../lib/i18n";
import type { Translations } from "../../lib/i18n";

interface ProductStat {
  productId: string;
  name: string;
  brand: string;
  qty: number;
  revenueIqd: number;
  profitIqd: number;
}

interface RangeStats {
  revenueIqd: number;
  costIqd: number;
  profitIqd: number;
  marginPct: number;
  saleCount: number;
  itemsSold: number;
  topProducts: ProductStat[];
  topProductsByProfit: ProductStat[];
  topBrands: { brand: string; qty: number; revenueIqd: number; profitIqd: number }[];
  byType: { type: string; qty: number; revenueIqd: number; profitIqd: number }[];
}

interface CashierStat {
  cashierId: string;
  name: string;
  username: string;
  revenueIqd: number;
  profitIqd: number;
  saleCount: number;
  itemsSold: number;
}

interface Overview {
  today: RangeStats;
  week: RangeStats;
  month: RangeStats;
  cashierPerformance: CashierStat[];
  trend: { date: string; revenueIqd: number; saleCount: number }[];
  lowStock: Product[];
  inventoryValueIqd: number;
  productCount: number;
}

function toProductItems(stats: RangeStats, color: string, t: Translations): RankedBarItem[] {
  return stats.topProducts.map((p) => ({
    key: p.productId,
    label: p.name,
    sublabel: p.brand,
    value: p.qty,
    formattedValue: t.reports.soldSuffix(p.qty),
    color,
  }));
}

function toProfitItems(stats: RangeStats, color: string): RankedBarItem[] {
  return stats.topProductsByProfit.map((p) => ({
    key: p.productId,
    label: p.name,
    sublabel: p.brand,
    value: Math.max(0, p.profitIqd),
    formattedValue: formatIqd(p.profitIqd),
    color,
  }));
}

function pctLabel(pct: number, t: Translations) {
  const sign = pct >= 0 ? "" : "-";
  return t.reports.marginPct(`${sign}${Math.abs(pct).toFixed(1)}`);
}

function isoDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function TrendTooltip({ active, payload, lang, t }: { active?: boolean; payload?: { payload: { date: string; revenueIqd: number; saleCount: number } }[]; lang: string; t: Translations }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const label = new Date(d.date).toLocaleDateString(localeFor(lang as "en" | "ar"), { weekday: "short", month: "short", day: "numeric" });
  return (
    <div className="bg-white border border-brand-100 rounded-lg shadow-md px-3 py-2 text-xs">
      <div className="font-medium text-brand-900">{label}</div>
      <div className="text-brand-600">{formatIqd(d.revenueIqd)}</div>
      <div className="text-brand-400">{t.reports.saleCountShort(d.saleCount)}</div>
    </div>
  );
}

function CashierPerformance({ cashiers, t }: { cashiers: CashierStat[]; t: Translations }) {
  if (cashiers.length === 0) {
    return <div className="text-sm text-brand-500 py-2">{t.reports.noSalesThisMonth}</div>;
  }
  const maxRevenue = Math.max(...cashiers.map((c) => c.revenueIqd), 1);
  return (
    <div className="space-y-3">
      {cashiers.map((c) => (
        <div key={c.cashierId}>
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-brand-900">{c.name}</span>
            <span className="text-sm text-brand-500 tabular-nums">{formatIqd(c.revenueIqd)}</span>
          </div>
          <div className="text-xs text-brand-400 mb-1">
            {t.reports.cashierStatLine(c.saleCount, c.itemsSold, formatIqd(c.profitIqd))}
          </div>
          <div className="h-1.5 rounded-full bg-brand-50 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.max(4, (c.revenueIqd / maxRevenue) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReportsPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [rangeFrom, setRangeFrom] = useState(isoDaysAgo(30));
  const [rangeTo, setRangeTo] = useState(isoDaysAgo(0));
  const [rangeData, setRangeData] = useState<RangeStats | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const t = useT();
  const lang = useLang();

  useEffect(() => {
    api.get<Overview>("/reports/overview").then(setData);
  }, []);

  async function runCustomRange() {
    setRangeLoading(true);
    try {
      const result = await api.get<RangeStats>(`/reports/range?from=${rangeFrom}&to=${rangeTo}`);
      setRangeData(result);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.reports.runReportFailed);
    } finally {
      setRangeLoading(false);
    }
  }

  async function exportSales() {
    setExporting(true);
    try {
      await downloadFile(`/reports/export/sales?from=${rangeFrom}&to=${rangeTo}`, `sales-${rangeFrom}-to-${rangeTo}.csv`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.reports.exportFailed);
    } finally {
      setExporting(false);
    }
  }

  async function exportProducts() {
    setExporting(true);
    try {
      await downloadFile("/reports/export/products", `products-${isoDaysAgo(0)}.csv`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.reports.exportFailed);
    } finally {
      setExporting(false);
    }
  }

  if (!data) {
    return <div className="p-4 text-brand-500">{t.reports.loadingReports}</div>;
  }

  const typeItems: RankedBarItem[] = data.month.byType.map((tp) => ({
    key: tp.type,
    label: tp.type,
    value: tp.qty,
    formattedValue: t.reports.soldSuffix(tp.qty),
    color: TYPE_COLOR[tp.type] ?? CATEGORICAL[5],
  }));

  const brandItems: RankedBarItem[] = data.month.topBrands.map((b) => ({
    key: b.brand,
    label: b.brand,
    value: b.qty,
    formattedValue: formatIqd(b.revenueIqd),
    color: CATEGORICAL[2],
  }));

  return (
    <div className="p-4 pb-8 space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-brand-900">{t.reports.title}</h1>
        <Link to="/admin/cash-up" className="press text-sm text-brand-600 underline">
          {t.reports.dailyCashUp}
        </Link>
      </div>

      {/* Revenue KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard icon={<ClockIcon />} label={t.reports.today} value={formatIqd(data.today.revenueIqd)} sublabel={t.reports.saleCountItems(data.today.saleCount, data.today.itemsSold)} delay={0} accent />
        <StatCard icon={<CalendarIcon />} label={t.reports.thisWeek} value={formatIqd(data.week.revenueIqd)} sublabel={t.reports.saleCountItems(data.week.saleCount, data.week.itemsSold)} delay={0.05} />
        <StatCard icon={<CalendarIcon />} label={t.reports.thisMonth} value={formatIqd(data.month.revenueIqd)} sublabel={t.reports.saleCountItems(data.month.saleCount, data.month.itemsSold)} delay={0.1} />
      </div>

      {/* Profit KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label={t.reports.profitToday} value={formatIqd(data.today.profitIqd)} sublabel={pctLabel(data.today.marginPct, t)} delay={0.02} />
        <StatCard label={t.reports.profitWeek} value={formatIqd(data.week.profitIqd)} sublabel={pctLabel(data.week.marginPct, t)} delay={0.07} />
        <StatCard label={t.reports.profitMonth} value={formatIqd(data.month.profitIqd)} sublabel={pctLabel(data.month.marginPct, t)} delay={0.12} />
      </div>

      {/* Revenue trend */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.14 }}
        className="bg-white border border-brand-100 rounded-xl p-4"
      >
        <h2 className="font-medium text-brand-900 mb-3">{t.reports.revenueTrend}</h2>
        <div className="h-48" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.trend} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => new Date(d).toLocaleDateString(localeFor(lang), { day: "numeric", month: "short" })}
                tick={{ fontSize: 11, fill: CHART_INK.muted }}
                axisLine={{ stroke: CHART_INK.grid }}
                tickLine={false}
                interval={1}
              />
              <Tooltip content={<TrendTooltip lang={lang} t={t} />} cursor={{ fill: "rgba(24,24,27,0.06)" }} />
              <Bar dataKey="revenueIqd" fill={SEQUENTIAL_BLUE} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top products: week vs month, side by side — spot trends like "Sauvage is up this week" */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.16 }}
          className="bg-white border border-brand-100 rounded-xl p-4"
        >
          <h2 className="font-medium text-brand-900 mb-3">{t.reports.topProductsWeek}</h2>
          <RankedBarList items={toProductItems(data.week, CATEGORICAL[0], t)} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.2 }}
          className="bg-white border border-brand-100 rounded-xl p-4"
        >
          <h2 className="font-medium text-brand-900 mb-3">{t.reports.topProductsMonth}</h2>
          <RankedBarList items={toProductItems(data.month, CATEGORICAL[1], t)} />
        </motion.div>
      </div>

      {/* Most profitable vs cashier performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.22 }}
          className="bg-white border border-brand-100 rounded-xl p-4"
        >
          <h2 className="font-medium text-brand-900 mb-1">{t.reports.mostProfitableMonth}</h2>
          <p className="text-xs text-brand-400 mb-3">{t.reports.mostProfitableHint}</p>
          <RankedBarList items={toProfitItems(data.month, CATEGORICAL[6])} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.26 }}
          className="bg-white border border-brand-100 rounded-xl p-4"
        >
          <h2 className="font-medium text-brand-900 mb-3">{t.reports.cashierPerformanceMonth}</h2>
          <CashierPerformance cashiers={data.cashierPerformance} t={t} />
        </motion.div>
      </div>

      {/* Brands & types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.3 }}
          className="bg-white border border-brand-100 rounded-xl p-4"
        >
          <h2 className="font-medium text-brand-900 mb-3">{t.reports.topBrandsMonth}</h2>
          <RankedBarList items={brandItems} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.34 }}
          className="bg-white border border-brand-100 rounded-xl p-4"
        >
          <h2 className="font-medium text-brand-900 mb-3">{t.reports.salesByTypeMonth}</h2>
          <RankedBarList items={typeItems} />
        </motion.div>
      </div>

      {/* Inventory snapshot + low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.38 }}
          className="grid grid-cols-2 gap-3"
        >
          <StatCard label={t.reports.inventoryValue} value={formatIqd(data.inventoryValueIqd)} icon={<PackageIcon />} />
          <StatCard label={t.reports.activeProducts} value={String(data.productCount)} icon={<BottleIcon />} sublabel={t.reports.lowOnStock(data.lowStock.length)} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.42 }}
          className="bg-white border border-brand-100 rounded-xl p-4"
        >
          <h2 className="font-medium text-brand-900 mb-2">{t.reports.lowStock}</h2>
          {data.lowStock.length === 0 && <div className="text-sm text-brand-500 py-2">{t.reports.allGood}</div>}
          <ul className="space-y-1.5 text-sm">
            {data.lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <span className="truncate">
                    {p.brand} {p.name} ({p.size})
                  </span>
                </span>
                <span className="text-amber-600 font-medium flex-shrink-0">{t.reports.left(p.stock)}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Custom range + export */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1], delay: 0.46 }}
        className="bg-white border border-brand-100 rounded-xl p-4"
      >
        <h2 className="font-medium text-brand-900 mb-1">{t.reports.customRangeExport}</h2>
        <p className="text-xs text-brand-400 mb-3">{t.reports.customRangeHint}</p>

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-brand-900 mb-1">{t.reports.from}</label>
            <input
              type="date"
              className="border border-brand-100 rounded-lg px-3 py-2 text-sm"
              value={rangeFrom}
              max={rangeTo}
              onChange={(e) => setRangeFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-900 mb-1">{t.reports.to}</label>
            <input
              type="date"
              className="border border-brand-100 rounded-lg px-3 py-2 text-sm"
              value={rangeTo}
              min={rangeFrom}
              max={isoDaysAgo(0)}
              onChange={(e) => setRangeTo(e.target.value)}
            />
          </div>
          <button onClick={runCustomRange} disabled={rangeLoading} className="press px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {rangeLoading ? t.reports.running : t.reports.runReport}
          </button>
          <button onClick={exportSales} disabled={exporting} className="press px-4 py-2 border border-brand-200 rounded-lg text-sm font-medium text-brand-900 disabled:opacity-60">
            {t.reports.exportSales}
          </button>
          <button onClick={exportProducts} disabled={exporting} className="press px-4 py-2 border border-brand-200 rounded-lg text-sm font-medium text-brand-900 disabled:opacity-60">
            {t.reports.exportProducts}
          </button>
        </div>

        {rangeData && (
          <div className="border-t border-brand-100 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatCard label={t.reports.revenue} value={formatIqd(rangeData.revenueIqd)} />
              <StatCard label={t.reports.profit} value={formatIqd(rangeData.profitIqd)} sublabel={pctLabel(rangeData.marginPct, t)} />
              <StatCard label={t.reports.sales} value={String(rangeData.saleCount)} />
              <StatCard label={t.reports.itemsSold} value={String(rangeData.itemsSold)} />
            </div>
            <h3 className="text-sm font-medium text-brand-900 mb-2">{t.reports.topProductsInRange}</h3>
            <RankedBarList items={toProductItems(rangeData, CATEGORICAL[0], t)} emptyLabel={t.reports.noSalesInRange} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
