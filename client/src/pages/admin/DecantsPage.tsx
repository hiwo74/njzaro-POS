import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "../../lib/api";
import type { Decant, Product } from "../../lib/types";
import { formatIqd } from "../../lib/currency";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ProductImage } from "../../components/ProductImage";
import { CloseIcon, SearchIcon } from "../../components/Icons";
import { useT } from "../../lib/i18n";

const QUICK_SIZES_ML = [2, 3, 5, 10, 15, 20, 30, 50];

interface SizeRow {
  price: string;
  sku: string;
}

export function DecantsPage() {
  const t = useT();
  const [sourceQuery, setSourceQuery] = useState("");
  const [sourceResults, setSourceResults] = useState<Product[]>([]);
  const [selectedSource, setSelectedSource] = useState<Product | null>(null);
  const [sizes, setSizes] = useState<Record<number, SizeRow>>({});
  const [customSize, setCustomSize] = useState("");
  const [creating, setCreating] = useState(false);
  const [decants, setDecants] = useState<Decant[]>([]);
  const [deactivateTarget, setDeactivateTarget] = useState<Decant | null>(null);

  useEffect(() => {
    if (selectedSource) return;
    const params = new URLSearchParams({ isDecant: "false", activeOnly: "true" });
    if (sourceQuery) params.set("q", sourceQuery);
    api.get<Product[]>(`/products?${params.toString()}`).then(setSourceResults);
  }, [sourceQuery, selectedSource]);

  async function loadDecants(sourceProductId?: string) {
    const params = new URLSearchParams();
    if (sourceProductId) params.set("sourceProductId", sourceProductId);
    setDecants(await api.get<Decant[]>(`/decants?${params.toString()}`));
  }

  useEffect(() => {
    loadDecants(selectedSource?.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSource]);

  function selectSource(p: Product) {
    setSelectedSource(p);
    setSizes({});
    setSourceQuery("");
  }

  function changeSource() {
    setSelectedSource(null);
    setSizes({});
  }

  function toggleSize(ml: number) {
    setSizes((prev) => {
      if (prev[ml]) {
        const next = { ...prev };
        delete next[ml];
        return next;
      }
      return { ...prev, [ml]: { price: "", sku: "" } };
    });
  }

  function addCustomSize() {
    const ml = Number(customSize);
    if (!ml || ml <= 0) return;
    setSizes((prev) => (prev[ml] ? prev : { ...prev, [ml]: { price: "", sku: "" } }));
    setCustomSize("");
  }

  function updateSizeField(ml: number, field: keyof SizeRow, value: string) {
    setSizes((prev) => ({ ...prev, [ml]: { ...prev[ml], [field]: value } }));
  }

  const selectedMls = Object.keys(sizes).map(Number).sort((a, b) => a - b);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!selectedSource || selectedMls.length === 0) return;
    if (selectedMls.some((ml) => !sizes[ml].price || Number(sizes[ml].price) <= 0)) {
      toast.error(t.decants.priceRequired);
      return;
    }
    setCreating(true);
    try {
      await api.post("/decants/bulk", {
        sourceProductId: selectedSource.id,
        decants: selectedMls.map((ml) => ({
          decantMl: ml,
          sellPriceIqd: Number(sizes[ml].price),
          sku: sizes[ml].sku || null,
        })),
      });
      toast.success(t.decants.createdSuccess(selectedMls.length, `${selectedSource.brand} ${selectedSource.name}`));
      setSizes({});
      loadDecants(selectedSource.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.decants.createFailed);
    } finally {
      setCreating(false);
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    try {
      await api.delete(`/products/${deactivateTarget.id}`);
      toast.success(t.decants.removeSuccess);
      setDeactivateTarget(null);
      loadDecants(selectedSource?.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.decants.removeFailed);
    }
  }

  return (
    <div className="p-4 pb-8 max-w-3xl">
      <h1 className="text-lg font-semibold text-brand-900 mb-1">{t.decants.title}</h1>
      <p className="text-sm text-brand-900 mb-4">{t.decants.hint}</p>

      {!selectedSource ? (
        <div className="relative mb-4">
          <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
          <input
            placeholder={t.decants.searchPlaceholder}
            className="w-full border border-brand-100 rounded-lg ps-9 pe-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
            value={sourceQuery}
            onChange={(e) => setSourceQuery(e.target.value)}
          />
          {sourceQuery && (
            <div className="mt-2 bg-surface border border-brand-100 rounded-xl overflow-hidden divide-y divide-brand-50 max-h-72 overflow-y-auto">
              {sourceResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectSource(p)}
                  className="press w-full flex items-center gap-3 p-2.5 text-start hover:bg-brand-50"
                >
                  <ProductImage src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium text-brand-900 truncate">{p.name}</div>
                    <div className="text-xs text-brand-900">{p.brand} · {p.size}</div>
                  </div>
                </button>
              ))}
              {sourceResults.length === 0 && (
                <div className="p-3 text-sm text-brand-900">{t.decants.noProductsFound}</div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4">
          <div className="bg-surface border border-brand-100 rounded-xl p-3 flex items-center gap-3">
            <ProductImage src={selectedSource.imageUrl} alt={selectedSource.name} className="w-12 h-12 rounded-lg flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-medium text-brand-900 truncate">{selectedSource.name}</div>
              <div className="text-xs text-brand-900">{selectedSource.brand} · {selectedSource.size}</div>
            </div>
            <button type="button" onClick={changeSource} className="press text-sm text-brand-900 underline flex-shrink-0">
              {t.decants.changeProduct}
            </button>
          </div>

          <form onSubmit={handleCreate} className="mt-4">
            <div className="text-sm font-medium text-brand-900 mb-2">{t.decants.quickSizes}</div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {QUICK_SIZES_ML.map((ml) => (
                <button
                  key={ml}
                  type="button"
                  onClick={() => toggleSize(ml)}
                  className={`press px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors duration-200 ${
                    sizes[ml] ? "bg-brand-500 text-white border-brand-500" : "bg-surface border-brand-100 text-brand-900"
                  }`}
                >
                  {t.decants.sizeMl(ml)}
                </button>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  placeholder={t.decants.customSizePlaceholder}
                  className="w-32 border border-brand-100 rounded-lg px-2.5 py-1.5 text-sm"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                />
                <button type="button" onClick={addCustomSize} className="press px-3 py-1.5 border border-brand-200 rounded-lg text-sm text-brand-900">
                  {t.decants.addSize}
                </button>
              </div>
            </div>

            {selectedMls.length > 0 && (
              <div className="space-y-2 mb-3">
                {selectedMls.map((ml) => (
                  <div key={ml} className="flex flex-wrap items-center gap-2 bg-surface border border-brand-100 rounded-lg p-2.5">
                    <span className="font-medium text-brand-900 w-14 flex-shrink-0">{t.decants.sizeMl(ml)}</span>
                    <input
                      type="number"
                      required
                      step="500"
                      inputMode="numeric"
                      placeholder={t.decants.pricePlaceholder}
                      className="flex-1 min-w-[110px] border rounded-lg px-2.5 py-1.5 text-sm"
                      value={sizes[ml].price}
                      onChange={(e) => updateSizeField(ml, "price", e.target.value)}
                    />
                    <input
                      placeholder={t.decants.skuPlaceholder}
                      className="w-32 border rounded-lg px-2.5 py-1.5 text-sm"
                      value={sizes[ml].sku}
                      onChange={(e) => updateSizeField(ml, "sku", e.target.value)}
                    />
                    <button type="button" onClick={() => toggleSize(ml)} className="press text-red-500 p-1" aria-label={t.common.remove}>
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedMls.length === 0 ? (
              <p className="text-sm text-brand-900">{t.decants.selectSizesHint}</p>
            ) : (
              <button type="submit" disabled={creating} className="press px-4 py-2 bg-brand-500 text-white rounded-lg font-medium disabled:opacity-60">
                {creating ? t.decants.creating : t.decants.createButton(selectedMls.length)}
              </button>
            )}
          </form>
        </div>
      )}

      <h2 className="text-sm font-semibold text-brand-900 mt-6 mb-2">
        {selectedSource ? t.decants.existingForProduct(`${selectedSource.brand} ${selectedSource.name}`) : t.decants.allDecants}
      </h2>

      {decants.length === 0 ? (
        <div className="bg-surface rounded-xl border border-brand-100 p-8 text-center text-brand-900">
          {selectedSource ? t.decants.noDecantsForProduct : t.decants.noDecantsYet}
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-brand-100 divide-y divide-brand-50">
          {decants.map((d) => (
            <div key={d.id} className="p-3 flex flex-wrap items-center gap-3">
              <ProductImage src={d.imageUrl} alt={d.name} className="w-10 h-10 rounded-lg flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-brand-900 truncate">
                  {d.name} · {t.decants.sizeMl(d.decantMl ?? 0)}
                </div>
                <div className="text-xs text-brand-900 truncate">
                  {!selectedSource && d.sourceProduct ? `${t.decants.colSource}: ${d.sourceProduct.brand} ${d.sourceProduct.name}` : d.sku || ""}
                  {!d.active && ` · ${t.common.inactive}`}
                </div>
              </div>
              <span className="font-semibold text-brand-900 text-sm flex-shrink-0">{formatIqd(d.sellPriceIqd)}</span>
              {d.active && (
                <button onClick={() => setDeactivateTarget(d)} className="press text-sm text-red-600 underline flex-shrink-0">
                  {t.decants.removeDecant}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deactivateTarget !== null}
        title={deactivateTarget ? t.decants.removeDecantTitle(`${deactivateTarget.name} ${t.decants.sizeMl(deactivateTarget.decantMl ?? 0)}`) : ""}
        message={t.decants.removeDecantMessage}
        confirmLabel={t.decants.removeDecant}
        cancelLabel={t.common.cancel}
        danger
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
