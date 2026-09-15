import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../lib/api";
import type { Sale, Settings } from "../lib/types";
import { formatIqd } from "../lib/currency";
import { PrintIcon } from "../components/Icons";
import { useT, useLang, localeFor } from "../lib/i18n";

export function ReceiptPage() {
  const { id } = useParams();
  const [sale, setSale] = useState<Sale | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const navigate = useNavigate();
  const t = useT();
  const lang = useLang();

  useEffect(() => {
    api.get<Sale>(`/sales/${id}`).then(setSale);
    api.get<Settings>("/settings").then(setSettings);
  }, [id]);

  if (!sale) return <div className="p-6 text-brand-500">{t.common.loading}</div>;

  return (
    <div className="min-h-screen bg-brand-50 flex flex-col items-center py-6 px-4 pt-safe pb-safe">
      <div className="no-print flex gap-2 mb-4">
        <button
          onClick={() => window.print()}
          className="press flex items-center gap-2 px-4 py-2.5 bg-brand-500 text-white rounded-lg font-medium"
        >
          <PrintIcon className="w-4 h-4" />
          {t.receipt.printReceipt}
        </button>
        <button
          onClick={() => navigate("/")}
          className="press px-4 py-2.5 bg-white border border-brand-100 text-brand-900 rounded-lg font-medium"
        >
          {t.receipt.backToCheckout}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="bg-white shadow-lg rounded-xl p-6 w-full max-w-sm font-mono text-sm"
      >
        <div className="text-center mb-3">
          <div className="text-lg font-bold">{settings?.shopName ?? "Njzaro Perfumes"}</div>
          {settings?.shopAddress && <div className="text-xs text-gray-600">{settings.shopAddress}</div>}
          <div className="text-xs text-gray-500 mt-1">{t.receipt.receiptNumber(sale.id)}</div>
          <div className="text-xs text-gray-500">{new Date(sale.createdAt).toLocaleString(localeFor(lang))}</div>
          <div className="text-xs text-gray-500">{t.receipt.cashierLabel(sale.cashier.name)}</div>
          {sale.status === "REFUNDED" && (
            <div className="text-xs font-bold text-red-600 mt-1">{t.receipt.refunded}</div>
          )}
        </div>

        <div className="border-t border-dashed border-gray-300 my-2" />

        {sale.items.map((item) => (
          <div key={item.id} className="flex justify-between mb-1">
            <span>
              {item.qty} × {item.nameSnapshot}
            </span>
            <span>{formatIqd(item.lineTotalIqd)}</span>
          </div>
        ))}

        <div className="border-t border-dashed border-gray-300 my-2" />

        <div className="flex justify-between">
          <span>{t.receipt.subtotal}</span>
          <span>{formatIqd(sale.subtotalIqd)}</span>
        </div>
        {sale.discountIqd > 0 && (
          <div className="flex justify-between">
            <span>{t.receipt.discount}</span>
            <span>-{formatIqd(sale.discountIqd)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold">
          <span>{t.receipt.total}</span>
          <span>{formatIqd(sale.totalIqd)}</span>
        </div>

        {settings?.receiptQrUrl && (
          <div className="flex justify-center mt-4">
            <img src={settings.receiptQrUrl} alt={t.receipt.qrAlt} className="w-24 h-24 object-contain" />
          </div>
        )}

        <div className="text-center text-xs text-gray-500 mt-3 whitespace-pre-line">
          {settings?.receiptMessage || t.receipt.defaultThanks}
        </div>
      </motion.div>
    </div>
  );
}
