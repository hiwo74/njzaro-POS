import { create } from "zustand";
import type { Product } from "../lib/types";

export interface CartLine {
  product: Product;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  discountIqd: number;
  addProduct: (product: Product) => void;
  incrementQty: (productId: string, delta: number) => void;
  removeLine: (productId: string) => void;
  setDiscount: (discountIqd: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  discountIqd: 0,

  addProduct(product) {
    // Decants have no stock of their own (poured on demand), so they're
    // never capped or blocked by a stock count — unlike ordinary products.
    const lines = get().lines;
    const existing = lines.find((l) => l.product.id === product.id);
    if (existing) {
      if (!product.isDecant && existing.qty >= product.stock) return;
      set({
        lines: lines.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l)),
      });
    } else {
      if (!product.isDecant && product.stock <= 0) return;
      set({ lines: [...lines, { product, qty: 1 }] });
    }
  },

  incrementQty(productId, delta) {
    const lines = get().lines
      .map((l) => (l.product.id === productId ? { ...l, qty: l.qty + delta } : l))
      .filter((l) => l.qty > 0);
    set({ lines });
  },

  removeLine(productId) {
    set({ lines: get().lines.filter((l) => l.product.id !== productId) });
  },

  setDiscount(discountIqd) {
    set({ discountIqd: Math.max(0, discountIqd) });
  },

  clear() {
    set({ lines: [], discountIqd: 0 });
  },
}));

export function cartSubtotalIqd(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.product.sellPriceIqd * l.qty, 0);
}
