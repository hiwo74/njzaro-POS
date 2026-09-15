import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../../lib/api";
import { formatIqd } from "../../lib/currency";
import type { Settings } from "../../lib/types";
import { PrintIcon } from "../../components/Icons";
import { useT, useLang, localeFor } from "../../lib/i18n";

interface ProductStat {
  productId: string;
  name: string;
  brand: string;
  qty: number;
  revenueIqd: number;
  profitIqd: number;
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

interface RangeStats {
  revenueIqd: number;
  costIqd: number;
  profitIqd: number;
  marginPct: number;
  saleCount: number;
  itemsSold: number;
  topProducts: ProductStat[];
  cashierPerformance: CashierStat[];
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function CashUpPage() {
  const [date, setDate] = useState(todayIso());
  const [data, setData] = useState<RangeStats | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const t = useT();
  const lang = useLang();

  useEffect(() => {
    api.get<Settings>("/settings").then(setSettings);
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get<RangeStats>(`/reports/range?from=${date}&to=${date}`).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [date]);

  const generatedAt = new Date();

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center py-6 px-4 pt-safe pb-safe">
      <div className="no-print flex flex-wrap items-end gap-3 mb-4 w-full max-w-md">
        <div>
          <label className="block text-xs font-medium text-brand-900 mb-1">{t.cashUp.date}</label>
          <input
            type="date"
            className="border border-brand-100 rounded-lg px-3 py-2 text-sm"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <button
          onClick={() => window.print()}
          className="press flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-lg font-medium text-sm"
        >
          <PrintIcon className="w-4 h-4" />
          {t.cashUp.print}
        </button>
        <button
          onClick={() => navigate("/admin/reports")}
          className="press px-4 py-2.5 bg-surface border border-brand-100 text-brand-900 rounded-lg font-medium text-sm"
        >
          {t.cashUp.backToReports}
        </button>
      </div>

      {loading || !data ? (
        <div className="text-brand-900">{t.cashUp.loading}</div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="bg-surface shadow-lg rounded-xl p-6 w-full max-w-md font-mono text-sm"
        >
          <div className="text-center mb-3">
            <div className="text-lg font-bold">{settings?.shopName ?? "Njzaro Perfumes"}</div>
            <div className="text-xs text-gray-600 mt-1">{t.cashUp.dailyCashUp}</div>
            <div className="text-xs text-gray-500">
              {new Date(date).toLocaleDateString(localeFor(lang), { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 my-2" />

          <div className="flex justify-between">
            <span>{t.cashUp.sales}</span>
            <span>{data.saleCount}</span>
          </div>
          <div className="flex justify-between">
            <span>{t.cashUp.itemsSold}</span>
            <span>{data.itemsSold}</span>
          </div>
          <div className="flex justify-between">
            <span>{t.cashUp.revenue}</span>
            <span>{formatIqd(data.revenueIqd)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t.cashUp.cost}</span>
            <span>{formatIqd(data.costIqd)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>{t.cashUp.profit}</span>
            <span>{formatIqd(data.profitIqd)}</span>
          </div>
          <div className="flex justify-between text-gray-500 text-xs">
            <span>{t.cashUp.margin}</span>
            <span>{data.marginPct.toFixed(1)}%</span>
          </div>

          {data.cashierPerformance.length > 0 && (
            <>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <div className="font-bold mb-1">{t.cashUp.byCashier}</div>
              {data.cashierPerformance.map((c) => (
                <div key={c.cashierId} className="flex justify-between mb-1">
                  <span>{c.name} ({c.saleCount})</span>
                  <span>{formatIqd(c.revenueIqd)}</span>
                </div>
              ))}
            </>
          )}

          {data.topProducts.length > 0 && (
            <>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <div className="font-bold mb-1">{t.cashUp.topProducts}</div>
              {data.topProducts.map((p) => (
                <div key={p.productId} className="flex justify-between mb-1">
                  <span>{p.qty}× {p.name}</span>
                  <span>{formatIqd(p.revenueIqd)}</span>
                </div>
              ))}
            </>
          )}

          {data.saleCount === 0 && (
            <>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <div className="text-center text-gray-500 py-2">{t.cashUp.noSalesForDay}</div>
            </>
          )}

          <div className="border-t border-dashed border-gray-300 my-2" />
          <div className="text-center text-xs text-gray-400 mt-2">
            {t.cashUp.generatedAt(generatedAt.toLocaleString(localeFor(lang)))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
