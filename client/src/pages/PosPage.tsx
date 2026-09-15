import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { api, ApiError } from "../lib/api";
import type { Product, Category, Decant, Sale } from "../lib/types";
import { formatIqd } from "../lib/currency";
import { useCartStore, cartSubtotalIqd, type CartLine } from "../store/cartStore";
import { ProductImage } from "../components/ProductImage";
import { CloseIcon, SearchIcon } from "../components/Icons";
import { useT } from "../lib/i18n";
import type { Translations } from "../lib/i18n";

const DRAWER_EASE = [0.32, 0.72, 0, 1] as const;
const MODAL_EASE = [0.23, 1, 0.32, 1] as const;

interface CartPanelProps {
  lines: CartLine[];
  subtotalIqd: number;
  discountIqd: number;
  totalIqd: number;
  checkingOut: boolean;
  onIncrement: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onDiscountChange: (v: number) => void;
  onCharge: () => void;
  t: Translations;
}

function CartPanel({
  lines,
  subtotalIqd,
  discountIqd,
  totalIqd,
  checkingOut,
  onIncrement,
  onRemove,
  onDiscountChange,
  onCharge,
  t,
}: CartPanelProps) {
  return (
    <>
      <div className="flex-1 space-y-2 mb-3 min-h-0 overflow-y-auto">
        {lines.length === 0 && <div className="text-sm text-brand-900">{t.pos.cartEmpty}</div>}
        <AnimatePresence initial={false}>
          {lines.map((l) => (
            <motion.div
              layout
              key={l.product.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: MODAL_EASE }}
              className="flex items-center justify-between gap-2 border-b border-brand-50 pb-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <ProductImage src={l.product.imageUrl} alt={l.product.name} className="w-9 h-9 rounded-md flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-brand-900 truncate">{l.product.name}</div>
                  <div className="text-xs text-brand-900">{t.pos.priceEach(formatIqd(l.product.sellPriceIqd))}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onIncrement(l.product.id, -1)}
                  className="press w-7 h-7 rounded bg-brand-100 text-brand-900"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm">{l.qty}</span>
                <button
                  onClick={() => onIncrement(l.product.id, 1)}
                  disabled={!l.product.isDecant && l.qty >= l.product.stock}
                  className="press w-7 h-7 rounded bg-brand-100 text-brand-900 disabled:opacity-40"
                >
                  +
                </button>
                <button onClick={() => onRemove(l.product.id)} className="press text-red-500 ms-1 p-1" aria-label={t.common.remove}>
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="space-y-2 border-t border-brand-100 pt-3">
        <div className="flex justify-between text-sm text-brand-900">
          <span>{t.pos.subtotal}</span>
          <span>{formatIqd(subtotalIqd)}</span>
        </div>

        <div className="flex justify-between items-center text-sm">
          <span className="text-brand-900">{t.pos.discountLabel}</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            className="w-28 border border-brand-100 rounded px-2 py-1.5 text-end"
            value={discountIqd || ""}
            onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
          />
        </div>

        <div className="flex justify-between font-semibold text-brand-900 text-base">
          <span>{t.pos.total}</span>
          <span>{formatIqd(totalIqd)}</span>
        </div>

        <button
          onClick={onCharge}
          disabled={lines.length === 0 || checkingOut}
          className="press w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg py-3.5 mt-2 disabled:opacity-50"
        >
          {checkingOut ? t.pos.processing : t.pos.charge}
        </button>
      </div>
    </>
  );
}

export function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [decantsByProduct, setDecantsByProduct] = useState<Record<string, Decant[]>>({});
  const [sizePickerProduct, setSizePickerProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category | "ALL">("ALL");
  const [checkingOut, setCheckingOut] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const t = useT();

  const CATEGORY_FILTERS: { label: string; value: Category | "ALL" }[] = [
    { label: t.pos.categoryAll, value: "ALL" },
    { label: t.pos.categoryMen, value: "MEN" },
    { label: t.pos.categoryWomen, value: "WOMEN" },
    { label: t.pos.categoryUnisex, value: "UNISEX" },
  ];

  const { lines, discountIqd, addProduct, incrementQty, removeLine, setDiscount, clear } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams({ activeOnly: "true", isDecant: "false" });
    if (search) params.set("q", search);
    if (category !== "ALL") params.set("category", category);
    api.get<Product[]>(`/products?${params.toString()}`).then(setProducts);
  }, [search, category]);

  async function loadDecantsMap() {
    const decants = await api.get<Decant[]>("/decants?activeOnly=true");
    const map: Record<string, Decant[]> = {};
    for (const d of decants) {
      if (!d.sourceProductId) continue;
      (map[d.sourceProductId] ??= []).push(d);
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => (a.decantMl ?? 0) - (b.decantMl ?? 0));
    }
    setDecantsByProduct(map);
  }

  useEffect(() => {
    loadDecantsMap();
  }, []);

  const subtotalIqd = useMemo(() => cartSubtotalIqd(lines), [lines]);
  const totalIqd = Math.max(0, subtotalIqd - discountIqd);
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);

  async function refreshProducts() {
    const params = new URLSearchParams({ activeOnly: "true", isDecant: "false" });
    if (search) params.set("q", search);
    if (category !== "ALL") params.set("category", category);
    setProducts(await api.get<Product[]>(`/products?${params.toString()}`));
    await loadDecantsMap();
  }

  function sizeOptionsFor(p: Product): Product[] {
    return [p, ...(decantsByProduct[p.id] ?? [])];
  }

  function handleProductClick(p: Product) {
    if (decantsByProduct[p.id]?.length) {
      setSizePickerProduct(p);
    } else {
      addProduct(p);
    }
  }

  function pickSize(option: Product) {
    addProduct(option);
    setSizePickerProduct(null);
  }

  async function handleCharge() {
    if (lines.length === 0) return;
    setCheckingOut(true);
    try {
      const sale = await api.post<Sale>("/sales", {
        items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })),
        discountIqd,
        amountPaid: totalIqd,
      });
      clear();
      setMobileCartOpen(false);
      await refreshProducts();
      toast.success(t.pos.saleComplete(sale.id), { description: formatIqd(sale.totalIqd) });
      navigate(`/receipt/${sale.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.pos.checkoutFailed);
    } finally {
      setCheckingOut(false);
    }
  }

  const cartPanelProps: CartPanelProps = {
    lines,
    subtotalIqd,
    discountIqd,
    totalIqd,
    checkingOut,
    onIncrement: incrementQty,
    onRemove: removeLine,
    onDiscountChange: setDiscount,
    onCharge: handleCharge,
    t,
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_380px] lg:h-[calc(100vh-57px)]">
      {/* Product catalog */}
      <div className="p-4 lg:overflow-y-auto">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[160px]">
            <SearchIcon className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-400" />
            <input
              placeholder={t.pos.searchPlaceholder}
              className="w-full border border-brand-100 rounded-lg ps-9 pe-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setCategory(f.value)}
                className={`press px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-200 ${
                  category === f.value ? "bg-brand-500 text-white" : "bg-surface border border-brand-100 text-brand-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {products.map((p) => {
            const options = sizeOptionsFor(p);
            const hasDecants = options.length > 1;
            // A decant is always purchasable (no stock of its own), so the
            // card is only "out of stock" when every option is a stocked
            // product sitting at zero.
            const outOfStock = options.every((o) => !o.isDecant && o.stock <= 0);
            const low = !outOfStock && !hasDecants && p.stock <= p.lowStockThreshold;
            const minPrice = hasDecants ? Math.min(...options.map((o) => o.sellPriceIqd)) : p.sellPriceIqd;
            return (
              <button
                key={p.id}
                disabled={outOfStock}
                onClick={() => handleProductClick(p)}
                className={`press hover-lift text-start bg-surface border rounded-xl overflow-hidden shadow-sm ${
                  outOfStock ? "opacity-50 cursor-not-allowed border-brand-100" : "border-brand-100"
                }`}
              >
                <ProductImage src={p.imageUrl} alt={p.name} className="w-full aspect-square" />
                <div className="p-3">
                  <div className="text-xs uppercase tracking-wide text-brand-900">{p.brand}</div>
                  <div className="font-medium text-brand-900 leading-tight">{p.name}</div>
                  <div className="text-xs text-brand-900 mb-2">
                    {p.size} · {p.type}
                  </div>
                  <div className="font-semibold text-brand-900">
                    {hasDecants ? t.pos.fromPrice(formatIqd(minPrice)) : formatIqd(minPrice)}
                  </div>
                  {hasDecants ? (
                    <div className="mt-2 text-xs text-brand-900">{t.pos.sizesAvailable(options.length)}</div>
                  ) : outOfStock ? (
                    <div className="mt-2 text-xs font-medium text-red-600">{t.pos.outOfStock}</div>
                  ) : low ? (
                    <div className="mt-2 text-xs font-medium text-amber-600">{t.pos.lowStock(p.stock)}</div>
                  ) : (
                    <div className="mt-2 text-xs text-brand-900">{t.pos.inStock(p.stock)}</div>
                  )}
                </div>
              </button>
            );
          })}
          {products.length === 0 && (
            <div className="col-span-full text-center text-brand-900 py-12">{t.pos.noProductsFound}</div>
          )}
        </div>
      </div>

      {/* Desktop cart panel */}
      <div className="hidden lg:flex lg:flex-col border-s border-brand-100 bg-surface p-4 overflow-y-auto">
        <h2 className="font-semibold text-brand-900 mb-3">{t.pos.currentSale}</h2>
        <CartPanel {...cartPanelProps} />
      </div>

      {/* Mobile sticky "view cart" bar */}
      {lines.length > 0 && (
        <div className="no-print lg:hidden fixed inset-x-0 z-20 px-3" style={{ bottom: "calc(64px + var(--safe-bottom) + 10px)" }}>
          <button
            onClick={() => setMobileCartOpen(true)}
            className="press w-full flex items-center justify-between bg-brand-500 text-white rounded-2xl px-4 py-3.5 shadow-lg shadow-black/20"
          >
            <span className="flex items-center gap-2 font-medium">
              <span className="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs tabular-nums">{itemCount}</span>
              {t.pos.viewCart}
            </span>
            <span className="font-semibold">{formatIqd(totalIqd)}</span>
          </button>
        </div>
      )}

      {/* Mobile cart drawer */}
      <AnimatePresence>
        {mobileCartOpen && (
          <>
            <motion.div
              className="no-print lg:hidden fixed inset-0 z-40 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: MODAL_EASE }}
              onClick={() => setMobileCartOpen(false)}
            />
            <motion.div
              className="no-print lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface rounded-t-2xl shadow-xl flex flex-col max-h-[85vh] pb-safe"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.5, ease: DRAWER_EASE }}
            >
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-brand-100 flex-shrink-0" />
              <div className="flex items-center justify-between px-4 pt-3">
                <h2 className="font-semibold text-brand-900">{t.pos.currentSale}</h2>
                <button onClick={() => setMobileCartOpen(false)} className="press text-brand-400 text-sm px-2 py-1">
                  {t.pos.close}
                </button>
              </div>
              <div className="flex flex-1 flex-col p-4 min-h-0 overflow-y-auto">
                <CartPanel {...cartPanelProps} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Size picker (full bottle + decants) */}
      <AnimatePresence>
        {sizePickerProduct && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: MODAL_EASE }}
              onClick={() => setSizePickerProduct(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: MODAL_EASE }}
              className="relative bg-surface rounded-2xl shadow-xl w-full max-w-sm p-4"
            >
              <div className="flex items-center gap-3 mb-1">
                <ProductImage src={sizePickerProduct.imageUrl} alt={sizePickerProduct.name} className="w-12 h-12 rounded-lg flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-brand-900 truncate">{sizePickerProduct.name}</div>
                  <div className="text-xs text-brand-900">{sizePickerProduct.brand}</div>
                </div>
                <button
                  onClick={() => setSizePickerProduct(null)}
                  className="press p-1 text-brand-400 flex-shrink-0"
                  aria-label={t.pos.close}
                >
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-brand-900 mb-3">{t.pos.chooseSize}</div>
              <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
                {sizeOptionsFor(sizePickerProduct).map((option) => {
                  // Decants are always purchasable — no stock of their own to run out of.
                  const optionOutOfStock = !option.isDecant && option.stock <= 0;
                  return (
                    <button
                      key={option.id}
                      disabled={optionOutOfStock}
                      onClick={() => pickSize(option)}
                      className={`press w-full flex items-center justify-between gap-3 border border-brand-100 rounded-lg px-3 py-2.5 text-start ${
                        optionOutOfStock ? "opacity-50 cursor-not-allowed" : "hover:bg-brand-50"
                      }`}
                    >
                      <span className="text-sm font-medium text-brand-900">{option.size}</span>
                      <span className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-brand-900">{formatIqd(option.sellPriceIqd)}</span>
                        {option.isDecant ? null : optionOutOfStock ? (
                          <span className="text-xs font-medium text-red-600">{t.pos.outOfStock}</span>
                        ) : option.stock <= option.lowStockThreshold ? (
                          <span className="text-xs font-medium text-amber-600">{t.pos.lowStock(option.stock)}</span>
                        ) : (
                          <span className="text-xs text-brand-900">{t.pos.inStock(option.stock)}</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
