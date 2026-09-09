import type { Prisma } from "@prisma/client";

import { CACHE_TAGS, cached, cartTag } from "@/lib/cache";
import type { CartData, CartLineData } from "@/lib/cart/types";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { priceCart, type CouponRule, type PricingLine } from "@/lib/pricing";
import {
  activeProductWhere,
  productCardSelect,
  toProductCard,
  type ProductCardData,
} from "@/lib/queries/products";
import { getStoreConfig } from "@/lib/queries/settings";
import { getShippingZones } from "@/lib/queries/shipping";

const cartSelect = {
  id: true,
  userId: true,
  couponCode: true,
  updatedAt: true,
  items: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      qty: true,
      priceAtAdd: true,
      variant: {
        select: {
          id: true,
          size: true,
          colorName: true,
          colorHex: true,
          price: true,
          stock: true,
          isActive: true,
          weightGrams: true,
          sku: true,
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              brandLine: true,
              basePrice: true,
              taxRate: true,
              hsnCode: true,
              status: true,
              deletedAt: true,
              images: {
                where: { kind: "IMAGE" },
                orderBy: { position: "asc" },
                select: {
                  url: true,
                  alt: true,
                  blurData: true,
                  variant: { select: { colorName: true } },
                },
              },
              categories: { select: { id: true } },
              collections: { select: { collectionId: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartSelect;

type CartRow = Prisma.CartGetPayload<{ select: typeof cartSelect }>;

export function toCouponRule(row: {
  code: string;
  type: CouponRule["type"];
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  appliesTo: CouponRule["appliesTo"];
  categoryIds: string[];
  productIds: string[];
  collectionIds: string[];
  bxgyBuyQty: number | null;
  bxgyGetQty: number | null;
  isFirstOrderOnly: boolean;
  isActive: boolean;
}): CouponRule {
  return { ...row };
}

export async function couponContextFor(userId: string | null, couponCode: string | null) {
  if (!userId) return { userRedemptions: 0, isFirstOrder: true };
  const [orders, redemptions] = await Promise.all([
    db.order.count({ where: { userId, status: { notIn: ["CANCELLED"] } } }),
    couponCode
      ? db.couponRedemption.count({ where: { userId, coupon: { code: couponCode } } })
      : Promise.resolve(0),
  ]);
  return { userRedemptions: redemptions, isFirstOrder: orders === 0 };
}

async function upsellFor(productIds: string[]): Promise<ProductCardData[]> {
  if (productIds.length === 0) return [];
  const related = await db.productRelation.findMany({
    where: {
      productId: { in: productIds },
      relatedProductId: { notIn: productIds },
      relatedProduct: activeProductWhere,
    },
    orderBy: { position: "asc" },
    take: 12,
    select: { relatedProductId: true, relatedProduct: { select: productCardSelect } },
  });
  const seen = new Set<string>();
  const cards: ProductCardData[] = [];
  for (const row of related) {
    if (seen.has(row.relatedProductId)) continue;
    seen.add(row.relatedProductId);
    cards.push(toProductCard(row.relatedProduct));
    if (cards.length === 6) break;
  }
  return cards;
}

async function buildCart(row: CartRow): Promise<CartData> {
  const [config, zones, couponRow] = await Promise.all([
    getStoreConfig(),
    getShippingZones(),
    row.couponCode
      ? db.coupon.findUnique({ where: { code: row.couponCode } })
      : Promise.resolve(null),
  ]);
  const ctx = await couponContextFor(row.userId, row.couponCode);

  const defaultZone = zones.find((z) => z.isDefault) ?? zones[0] ?? null;
  const rate = defaultZone?.rates[0] ?? null;

  const notices: string[] = [];
  const pricingLines: PricingLine[] = [];
  const meta = new Map<
    string,
    Omit<CartLineData, "lineTotal" | "discount" | "net" | "taxAmount" | "taxRate" | "qty"> & {
      qty: number;
    }
  >();

  for (const item of row.items) {
    const v = item.variant;
    const p = v.product;
    const available = v.isActive && p.status === "ACTIVE" && p.deletedAt === null;
    const stock = available ? v.stock : 0;
    const unitPrice = v.price ?? p.basePrice;
    const priceChanged = item.priceAtAdd > 0 && item.priceAtAdd !== unitPrice;
    const image =
      p.images.find((img) => img.variant?.colorName === v.colorName) ?? p.images[0] ?? null;

    if (!available) notices.push(`${p.name} (${v.colorName}, ${v.size}) is no longer available.`);
    else if (stock === 0) notices.push(`${p.name} (${v.colorName}, ${v.size}) is sold out.`);
    else if (item.qty > stock)
      notices.push(`Only ${stock} of ${p.name} (${v.size}) left; your bag asks for ${item.qty}.`);
    if (priceChanged) {
      notices.push(
        `${p.name} is now ${formatINR(unitPrice)} (was ${formatINR(item.priceAtAdd)} when you added it).`,
      );
    }

    pricingLines.push({
      id: item.id,
      productId: p.id,
      variantId: v.id,
      unitPrice,
      qty: item.qty,
      taxRate: p.taxRate,
      weightGrams: v.weightGrams,
      categoryIds: p.categories.map((c) => c.id),
      collectionIds: p.collections.map((c) => c.collectionId),
    });
    meta.set(item.id, {
      id: item.id,
      variantId: v.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      brandLine: p.brandLine,
      image: image ? { url: image.url, alt: image.alt, blurData: image.blurData } : null,
      size: v.size,
      colorName: v.colorName,
      colorHex: v.colorHex,
      qty: item.qty,
      maxQty: Math.max(0, Math.min(stock, config.maxQtyPerLine)),
      stock,
      available: available && stock > 0,
      unitPrice,
      priceAtAdd: item.priceAtAdd,
      priceChanged,
      weightGrams: v.weightGrams,
      sku: v.sku,
      hsnCode: p.hsnCode,
    });
  }

  const totals = priceCart({
    lines: pricingLines,
    coupon: couponRow ? toCouponRule(couponRow) : null,
    couponContext: { now: new Date(), ...ctx },
    shippingRate: rate
      ? {
          type: rate.type,
          baseRate: rate.baseRate,
          perKgRate: rate.perKgRate,
          freeAbove: rate.freeAbove,
        }
      : null,
  });

  const lines: CartLineData[] = totals.lines.map((l) => {
    const m = meta.get(l.id)!;
    return {
      ...m,
      qty: l.qty,
      taxRate: l.taxRate,
      lineTotal: l.lineTotal,
      discount: l.discount,
      net: l.net,
      taxAmount: l.taxAmount,
    };
  });

  const threshold = rate?.freeAbove ?? null;
  const discounted = totals.subtotal - totals.discountTotal;

  return {
    id: row.id,
    itemCount: totals.itemCount,
    lines,
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    shippingTotal: totals.shippingTotal,
    shippingLabel: rate ? `${rate.name} shipping (estimate)` : "Shipping",
    taxTotal: totals.taxTotal,
    grandTotal: totals.grandTotal,
    freeShipping: totals.freeShipping,
    freeShippingThreshold: threshold,
    freeShippingRemaining: threshold === null ? 0 : Math.max(0, threshold - discounted),
    coupon: totals.coupon
      ? {
          code: totals.coupon.code,
          description: couponRow?.description ?? null,
          freeShipping: totals.coupon.freeShipping,
        }
      : null,
    couponError:
      row.couponCode && !totals.coupon
        ? (totals.couponError?.message ?? `${row.couponCode} no longer applies.`)
        : null,
    notices,
    upsell: await upsellFor(Array.from(new Set(pricingLines.map((l) => l.productId)))),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * The cart read model, cached per cart and tagged so any mutation, product
 * change, setting or shipping edit invalidates it. Header, drawer and page
 * all read this.
 */
export function loadCartById(cartId: string): Promise<CartData | null> {
  return cached(
    async (id: string) => {
      const row = await db.cart.findUnique({ where: { id }, select: cartSelect });
      return row ? buildCart(row) : null;
    },
    ["cart:load"],
    [cartTag(cartId), CACHE_TAGS.products, CACHE_TAGS.settings, CACHE_TAGS.shipping],
    60,
  )(cartId);
}
