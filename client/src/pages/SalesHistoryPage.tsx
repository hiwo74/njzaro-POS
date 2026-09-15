import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api, ApiError } from "../lib/api";
import type { Sale, User } from "../lib/types";
import { formatIqd } from "../lib/currency";
import { useAuthStore } from "../store/authStore";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useT, useLang, localeFor } from "../lib/i18n";
import type { Translations } from "../lib/i18n";

function StatusBadge({ status, t }: { status: Sale["status"]; t: Translations }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        status === "REFUNDED" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
      }`}
    >
      {status === "REFUNDED" ? t.salesHistory.refunded : t.salesHistory.completed}
    </span>
  );
}

export function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [refundTarget, setRefundTarget] = useState<number | null>(null);
  const [cashiers, setCashiers] = useState<User[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [status, setStatus] = useState("");
  const [cashierId, setCashierId] = useState("");
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ADMIN";
  const t = useT();
  const lang = useLang();

  const STATUS_OPTIONS = [
    { label: t.salesHistory.allStatuses, value: "" },
    { label: t.salesHistory.completed, value: "COMPLETED" },
    { label: t.salesHistory.refunded, value: "REFUNDED" },
  ];

  async function load() {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (status) params.set("status", status);
    if (isAdmin && cashierId) params.set("cashierId", cashierId);
    setSales(await api.get<Sale[]>(`/sales?${params.toString()}`));
  }

  useEffect(() => {
    if (isAdmin) api.get<User[]>("/users").then(setCashiers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, status, cashierId]);

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setStatus("");
    setCashierId("");
  }

  const hasFilters = fromDate || toDate || status || cashierId;

  async function confirmRefund() {
    if (refundTarget === null) return;
    const id = refundTarget;
    setRefundTarget(null);
    try {
      await api.post(`/sales/${id}/refund`);
      toast.success(t.salesHistory.refundSuccessTitle(id), { description: t.salesHistory.refundSuccessDesc });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.salesHistory.refundFailed);
    }
  }

  return (
    <div className="p-4 pb-8">
      <h1 className="text-lg font-semibold text-brand-900 mb-4">{t.salesHistory.title}</h1>

      <div className="bg-surface border border-brand-100 rounded-xl p-3 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-brand-900 mb-1">{t.salesHistory.from}</label>
          <input type="date" className="border border-brand-100 rounded-lg px-2.5 py-1.5 text-sm" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-900 mb-1">{t.salesHistory.to}</label>
          <input type="date" className="border border-brand-100 rounded-lg px-2.5 py-1.5 text-sm" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-brand-900 mb-1">{t.salesHistory.status}</label>
          <select className="border border-brand-100 rounded-lg px-2.5 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <div>
            <label className="block text-xs font-medium text-brand-900 mb-1">{t.salesHistory.cashier}</label>
            <select className="border border-brand-100 rounded-lg px-2.5 py-1.5 text-sm" value={cashierId} onChange={(e) => setCashierId(e.target.value)}>
              <option value="">{t.salesHistory.allCashiers}</option>
              {cashiers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
        {hasFilters && (
          <button onClick={clearFilters} className="press text-sm text-brand-900 underline pb-1.5">
            {t.salesHistory.clearFilters}
          </button>
        )}
      </div>

      {sales.length === 0 && (
        <div className="bg-surface rounded-xl border border-brand-100 p-8 text-center text-brand-900">
          {hasFilters ? t.salesHistory.noMatch : t.salesHistory.noSalesYet}
        </div>
      )}

      {/* Mobile: card list */}
      <div className="lg:hidden space-y-2">
        {sales.map((s) => (
          <div key={s.id} className="bg-surface rounded-xl border border-brand-100 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-brand-900">{t.salesHistory.receiptHash(s.id)}</span>
              <StatusBadge status={s.status} t={t} />
            </div>
            <div className="text-xs text-brand-900 mb-2">
              {new Date(s.createdAt).toLocaleString(localeFor(lang))} · {s.cashier.name}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-900">{t.salesHistory.itemsCount(s.items.reduce((n, i) => n + i.qty, 0))}</span>
              <span className="font-semibold text-brand-900">{formatIqd(s.totalIqd)}</span>
            </div>
            <div className="flex gap-3 mt-2 pt-2 border-t border-brand-50">
              <Link to={`/receipt/${s.id}`} className="press text-sm text-brand-900 font-medium">
                {t.salesHistory.reprint}
              </Link>
              {user?.role === "ADMIN" && s.status === "COMPLETED" && (
                <button onClick={() => setRefundTarget(s.id)} className="press text-sm text-red-600 font-medium">
                  {t.salesHistory.refund}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      {sales.length > 0 && (
        <div className="hidden lg:block bg-surface rounded-xl border border-brand-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-brand-900 border-b border-brand-100">
                <th className="p-3">{t.salesHistory.colReceipt}</th>
                <th className="p-3">{t.salesHistory.colDate}</th>
                <th className="p-3">{t.salesHistory.colCashier}</th>
                <th className="p-3">{t.salesHistory.colItems}</th>
                <th className="p-3">{t.salesHistory.colTotal}</th>
                <th className="p-3">{t.salesHistory.colStatus}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-brand-50">
                  <td className="p-3">#{s.id}</td>
                  <td className="p-3">{new Date(s.createdAt).toLocaleString(localeFor(lang))}</td>
                  <td className="p-3">{s.cashier.name}</td>
                  <td className="p-3">{s.items.reduce((n, i) => n + i.qty, 0)}</td>
                  <td className="p-3">{formatIqd(s.totalIqd)}</td>
                  <td className="p-3">
                    <StatusBadge status={s.status} t={t} />
                  </td>
                  <td className="p-3 flex gap-2">
                    <Link to={`/receipt/${s.id}`} className="press text-brand-900 underline">
                      {t.salesHistory.reprint}
                    </Link>
                    {user?.role === "ADMIN" && s.status === "COMPLETED" && (
                      <button onClick={() => setRefundTarget(s.id)} className="press text-red-600 underline">
                        {t.salesHistory.refund}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={refundTarget !== null}
        title={refundTarget !== null ? t.salesHistory.refundDialogTitle(refundTarget) : ""}
        message={t.salesHistory.refundDialogMessage}
        confirmLabel={t.salesHistory.refund}
        cancelLabel={t.common.cancel}
        danger
        onConfirm={confirmRefund}
        onCancel={() => setRefundTarget(null)}
      />
    </div>
  );
}
