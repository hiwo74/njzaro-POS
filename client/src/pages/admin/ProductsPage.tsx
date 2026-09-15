import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { api, ApiError, uploadImage } from "../../lib/api";
import type { Category, PerfumeType, Product } from "../../lib/types";
import { formatIqd } from "../../lib/currency";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ProductImage } from "../../components/ProductImage";
import { useT } from "../../lib/i18n";

const CATEGORIES: Category[] = ["MEN", "WOMEN", "UNISEX"];
const TYPES: PerfumeType[] = ["EDP", "EDT", "PARFUM", "ATTAR", "OIL"];
const MODAL_EASE = [0.23, 1, 0.32, 1] as const;

type FormState = {
  id?: string;
  name: string;
  brand: string;
  category: Category;
  type: PerfumeType;
  size: string;
  sku: string;
  sellPriceIqd: string;
  costPriceIqd: string;
  stock: string;
  lowStockThreshold: string;
  imageUrl: string | null;
};

const EMPTY_FORM: FormState = {
  name: "",
  brand: "",
  category: "UNISEX",
  type: "EDP",
  size: "",
  sku: "",
  sellPriceIqd: "",
  costPriceIqd: "",
  stock: "",
  lowStockThreshold: "3",
  imageUrl: null,
};

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const t = useT();

  async function load() {
    setProducts(await api.get<Product[]>("/products?isDecant=false"));
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(p: Product) {
    setForm({
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      type: p.type,
      size: p.size,
      sku: p.sku ?? "",
      sellPriceIqd: String(p.sellPriceIqd),
      costPriceIqd: String(p.costPriceIqd),
      stock: String(p.stock),
      lowStockThreshold: String(p.lowStockThreshold),
      imageUrl: p.imageUrl,
    });
    setShowForm(true);
  }

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.products.uploadImageFailed);
    } finally {
      setUploading(false);
    }
  }

  function startNew() {
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      brand: form.brand,
      category: form.category,
      type: form.type,
      size: form.size,
      sku: form.sku || null,
      sellPriceIqd: Number(form.sellPriceIqd),
      costPriceIqd: Number(form.costPriceIqd) || 0,
      stock: Number(form.stock) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || 3,
      imageUrl: form.imageUrl,
      active: true,
    };
    try {
      if (form.id) {
        await api.put(`/products/${form.id}`, payload);
        toast.success(t.products.productUpdated);
      } else {
        await api.post("/products", payload);
        toast.success(t.products.productAdded);
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.products.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeactivate() {
    if (!deactivateTarget) return;
    try {
      await api.delete(`/products/${deactivateTarget.id}`);
      toast.success(t.products.deactivated(deactivateTarget.name));
      setDeactivateTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.products.deactivateFailed);
    }
  }

  async function adjustStock(id: string, delta: number) {
    try {
      await api.patch(`/products/${id}/stock`, { delta });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.products.stockUpdateFailed);
    }
  }

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-brand-900">{t.products.title}</h1>
        <button onClick={startNew} className="press px-4 py-2 bg-brand-500 text-white rounded-lg font-medium">
          {t.products.addProduct}
        </button>
      </div>

      {products.length === 0 && (
        <div className="bg-surface rounded-xl border border-brand-100 p-8 text-center text-brand-900">{t.products.noProductsYet}</div>
      )}

      {/* Mobile: card list */}
      <div className="lg:hidden space-y-2">
        {products.map((p) => (
          <div key={p.id} className="bg-surface rounded-xl border border-brand-100 p-3 flex gap-3">
            <ProductImage src={p.imageUrl} alt={p.name} className="w-14 h-14 rounded-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-brand-900 truncate">{p.name}</div>
                  <div className="text-xs text-brand-900">{p.brand} · {p.category} · {p.type}</div>
                </div>
                {!p.active && <span className="text-xs text-gray-400 flex-shrink-0">{t.common.inactive}</span>}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-semibold text-brand-900">{formatIqd(p.sellPriceIqd)}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => adjustStock(p.id, -1)} className="press w-7 h-7 bg-brand-100 rounded">−</button>
                  <span className={`w-6 text-center text-sm ${p.stock <= p.lowStockThreshold ? "text-amber-600 font-medium" : ""}`}>{p.stock}</span>
                  <button onClick={() => adjustStock(p.id, 1)} className="press w-7 h-7 bg-brand-100 rounded">+</button>
                </div>
              </div>
              <div className="flex gap-3 mt-2 pt-2 border-t border-brand-50">
                <button onClick={() => startEdit(p)} className="press text-sm text-brand-900 font-medium">{t.common.edit}</button>
                {p.active && (
                  <button onClick={() => setDeactivateTarget(p)} className="press text-sm text-red-600 font-medium">{t.products.deactivate}</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      {products.length > 0 && (
        <div className="hidden lg:block bg-surface rounded-xl border border-brand-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-brand-900 border-b border-brand-100">
                <th className="p-3"></th>
                <th className="p-3">{t.products.title}</th>
                <th className="p-3">{t.products.category}</th>
                <th className="p-3">{t.products.type}</th>
                <th className="p-3">{t.products.size}</th>
                <th className="p-3">{t.products.price}</th>
                <th className="p-3">{t.products.stock}</th>
                <th className="p-3">{t.products.status}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-brand-50">
                  <td className="p-3">
                    <ProductImage src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg" />
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-brand-900">{p.name}</div>
                    <div className="text-xs text-brand-900">{p.brand}</div>
                  </td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">{p.type}</td>
                  <td className="p-3">{p.size}</td>
                  <td className="p-3">{formatIqd(p.sellPriceIqd)}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => adjustStock(p.id, -1)} className="press w-6 h-6 bg-brand-100 rounded">−</button>
                      <span className={p.stock <= p.lowStockThreshold ? "text-amber-600 font-medium" : ""}>{p.stock}</span>
                      <button onClick={() => adjustStock(p.id, 1)} className="press w-6 h-6 bg-brand-100 rounded">+</button>
                    </div>
                  </td>
                  <td className="p-3">
                    {p.active ? <span className="text-green-700">{t.common.active}</span> : <span className="text-gray-400">{t.common.inactive}</span>}
                  </td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => startEdit(p)} className="press text-brand-900 underline">{t.common.edit}</button>
                    {p.active && (
                      <button onClick={() => setDeactivateTarget(p)} className="press text-red-600 underline">{t.products.deactivate}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: MODAL_EASE }}
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: MODAL_EASE }}
              className="relative bg-surface rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <form onSubmit={handleSubmit} className="p-5 grid grid-cols-2 gap-3">
                <h2 className="col-span-full text-lg font-semibold text-brand-900">
                  {form.id ? t.products.editProduct : t.products.addProduct.replace("+ ", "")}
                </h2>

                <div className="col-span-full flex items-center gap-3">
                  <ProductImage src={form.imageUrl} alt="Preview" className="w-16 h-16 rounded-lg border border-brand-100 flex-shrink-0" />
                  <div>
                    <label className="press inline-block px-3 py-1.5 border border-brand-200 rounded-lg text-sm text-brand-900 cursor-pointer hover:bg-brand-50">
                      {uploading ? t.products.uploading : form.imageUrl ? t.products.changePhoto : t.products.addPhoto}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageSelect} disabled={uploading} />
                    </label>
                    {form.imageUrl && (
                      <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: null }))} className="press ms-2 text-sm text-red-600 underline">
                        {t.common.remove}
                      </button>
                    )}
                  </div>
                </div>

                <input required placeholder={t.products.namePlaceholder} className="border rounded-lg px-3 py-2 col-span-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input required placeholder={t.products.brandPlaceholder} className="border rounded-lg px-3 py-2" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                <input placeholder={t.products.sizePlaceholder} className="border rounded-lg px-3 py-2" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />

                <select className="border rounded-lg px-3 py-2" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <select className="border rounded-lg px-3 py-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PerfumeType })}>
                  {TYPES.map((tp) => (
                    <option key={tp} value={tp}>{tp}</option>
                  ))}
                </select>
                <input placeholder={t.products.skuPlaceholder} className="border rounded-lg px-3 py-2 col-span-2" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />

                <input required type="number" step="500" inputMode="numeric" placeholder={t.products.sellPricePlaceholder} className="border rounded-lg px-3 py-2" value={form.sellPriceIqd} onChange={(e) => setForm({ ...form, sellPriceIqd: e.target.value })} />
                <input type="number" step="500" inputMode="numeric" placeholder={t.products.costPricePlaceholder} className="border rounded-lg px-3 py-2" value={form.costPriceIqd} onChange={(e) => setForm({ ...form, costPriceIqd: e.target.value })} />
                <input type="number" inputMode="numeric" placeholder={t.products.stockPlaceholder} className="border rounded-lg px-3 py-2" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                <input type="number" inputMode="numeric" placeholder={t.products.lowStockThresholdPlaceholder} className="border rounded-lg px-3 py-2" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />

                <div className="col-span-full flex gap-2 mt-1">
                  <button type="submit" disabled={saving} className="press px-4 py-2 bg-brand-500 text-white rounded-lg font-medium disabled:opacity-60">
                    {saving ? t.products.saving : form.id ? t.products.saveChanges : t.products.addProduct.replace("+ ", "")}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="press px-4 py-2 border border-brand-200 rounded-lg">
                    {t.common.cancel}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deactivateTarget !== null}
        title={deactivateTarget ? t.products.deactivateTitle(deactivateTarget.name) : ""}
        message={t.products.deactivateMessage}
        confirmLabel={t.products.deactivate}
        cancelLabel={t.common.cancel}
        danger
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}
