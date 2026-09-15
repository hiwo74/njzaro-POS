export type Role = "ADMIN" | "CASHIER";
export type Category = "MEN" | "WOMEN" | "UNISEX";
export type PerfumeType = "EDP" | "EDT" | "PARFUM" | "ATTAR" | "OIL";

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  active?: boolean;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  type: PerfumeType;
  size: string;
  sku: string | null;
  sellPriceIqd: number;
  costPriceIqd: number;
  stock: number;
  lowStockThreshold: number;
  imageUrl: string | null;
  active: boolean;
  isDecant: boolean;
  decantMl: number | null;
  sourceProductId: string | null;
}

export interface DecantSourceSummary {
  id: string;
  name: string;
  brand: string;
  imageUrl: string | null;
}

export interface Decant extends Product {
  sourceProduct: DecantSourceSummary | null;
}

export interface SaleItem {
  id: string;
  productId: string;
  nameSnapshot: string;
  priceIqdSnapshot: number;
  qty: number;
  lineTotalIqd: number;
}

export interface Sale {
  id: number;
  cashierId: string;
  cashier: { name: string; username: string };
  subtotalIqd: number;
  discountIqd: number;
  totalIqd: number;
  amountPaid: number;
  changeGiven: number;
  status: "COMPLETED" | "REFUNDED";
  createdAt: string;
  items: SaleItem[];
}

export interface Settings {
  shopName: string;
  shopAddress: string;
  receiptMessage: string;
  receiptQrUrl: string;
  [key: string]: string;
}
