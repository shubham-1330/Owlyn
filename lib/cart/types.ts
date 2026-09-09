import type { ProductCardData } from "@/lib/queries/products";

/** JSON-safe cart as rendered by the header, drawer and cart page. One source. */

export type CartLineData = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  brandLine: string;
  image: { url: string; alt: string; blurData: string | null } | null;
  size: string;
  colorName: string;
  colorHex: string;
  qty: number;
  /** Upper bound for the stepper: min(stock, per-line maximum from settings). */
  maxQty: number;
  stock: number;
  available: boolean;
  unitPrice: number;
  priceAtAdd: number;
  priceChanged: boolean;
  lineTotal: number;
  discount: number;
  net: number;
  taxRate: number;
  taxAmount: number;
};

export type CartData = {
  id: string;
  itemCount: number;
  lines: CartLineData[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  shippingLabel: string;
  taxTotal: number;
  grandTotal: number;
  freeShipping: boolean;
  freeShippingThreshold: number | null;
  /** Discounted merchandise amount still needed for free shipping; 0 when reached. */
  freeShippingRemaining: number;
  coupon: { code: string; description: string | null; freeShipping: boolean } | null;
  couponError: string | null;
  notices: string[];
  upsell: ProductCardData[];
  updatedAt: string;
};

export const EMPTY_CART: CartData = {
  id: "",
  itemCount: 0,
  lines: [],
  subtotal: 0,
  discountTotal: 0,
  shippingTotal: 0,
  shippingLabel: "Standard shipping",
  taxTotal: 0,
  grandTotal: 0,
  freeShipping: false,
  freeShippingThreshold: null,
  freeShippingRemaining: 0,
  coupon: null,
  couponError: null,
  notices: [],
  upsell: [],
  updatedAt: "",
};
