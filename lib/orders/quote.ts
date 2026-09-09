import { couponContextFor, toCouponRule } from "@/lib/cart/load";
import { db } from "@/lib/db";
import { estimateDeliveryWindow, formatDeliveryWindow } from "@/lib/delivery";
import { priceCart, type PricingLine } from "@/lib/pricing";
import { getStoreConfig } from "@/lib/queries/settings";
import { getShippingZones, lookupPincode } from "@/lib/queries/shipping";
import { findZoneForPincode, isValidPincode } from "@/lib/shipping";

/**
 * Shipping options for a bag and a pincode. Each option is priced by running
 * the whole bag through lib/pricing with that rate, so the shipping line and
 * the total on step 2 are the same numbers the order will be created with.
 * The reason text explains why shipping is or is not free.
 */

export type ShippingOption = {
  rateId: string;
  name: string;
  shippingTotal: number;
  grandTotal: number;
  freeShipping: boolean;
  reason: string;
  deliveryWindow: string;
  minDays: number;
  maxDays: number;
};

export type CheckoutQuote =
  | { status: "invalid_pincode" }
  | { status: "unserviceable"; message: string }
  | { status: "empty" }
  | {
      status: "ok";
      pincode: string;
      city: string | null;
      state: string | null;
      zoneName: string;
      codAvailable: boolean;
      codReason: string | null;
      codLimit: number;
      options: ShippingOption[];
    };

function reasonFor(input: {
  totals: {
    freeShipping: boolean;
    coupon: { freeShipping: boolean } | null;
    subtotal: number;
    discountTotal: number;
  };
  freeAbove: number | null;
}): string {
  const { totals, freeAbove } = input;
  const discounted = totals.subtotal - totals.discountTotal;
  if (totals.coupon?.freeShipping) return `Free with ${"your coupon"}.`;
  if (freeAbove === null) return "Charged per order.";
  if (totals.freeShipping) return `Free on bags over ${fmt(freeAbove)} after discounts.`;
  if (totals.discountTotal > 0 && totals.subtotal >= freeAbove) {
    return `Your coupon brought the bag under ${fmt(freeAbove)}, so shipping is charged. Free shipping counts the discounted total.`;
  }
  return `Free over ${fmt(freeAbove)}. You are ${fmt(freeAbove - discounted)} short.`;
}

function fmt(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export async function quoteCheckout(
  cartId: string,
  userId: string | null,
  pincode: string,
  now = new Date(),
): Promise<CheckoutQuote> {
  if (!isValidPincode(pincode)) return { status: "invalid_pincode" };
  const [cart, config, zones, pin] = await Promise.all([
    db.cart.findUnique({
      where: { id: cartId },
      select: {
        userId: true,
        couponCode: true,
        items: {
          select: {
            id: true,
            qty: true,
            variant: {
              select: {
                id: true,
                price: true,
                weightGrams: true,
                product: {
                  select: {
                    id: true,
                    basePrice: true,
                    taxRate: true,
                    categories: { select: { id: true } },
                    collections: { select: { collectionId: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    getStoreConfig(),
    getShippingZones(),
    lookupPincode(pincode),
  ]);
  if (!cart || cart.items.length === 0) return { status: "empty" };

  if (pin && !pin.isServiceable) {
    return {
      status: "unserviceable",
      message: `We do not deliver to ${pin.city} ${pincode} yet. Try another address.`,
    };
  }
  const zone =
    (pin?.zoneId ? zones.find((z) => z.id === pin.zoneId) : undefined) ??
    findZoneForPincode(pincode, zones);
  if (!zone || zone.rates.length === 0) {
    return {
      status: "unserviceable",
      message: `We do not deliver to ${pincode} yet. Try another address.`,
    };
  }

  const lines: PricingLine[] = cart.items.map((item) => ({
    id: item.id,
    productId: item.variant.product.id,
    variantId: item.variant.id,
    unitPrice: item.variant.price ?? item.variant.product.basePrice,
    qty: item.qty,
    taxRate: item.variant.product.taxRate,
    weightGrams: item.variant.weightGrams,
    categoryIds: item.variant.product.categories.map((c) => c.id),
    collectionIds: item.variant.product.collections.map((c) => c.collectionId),
  }));
  const couponRow = cart.couponCode
    ? await db.coupon.findUnique({ where: { code: cart.couponCode } })
    : null;
  const couponCtx = await couponContextFor(userId, cart.couponCode);
  const coupon = couponRow ? toCouponRule(couponRow) : null;
  const couponContext = { now, ...couponCtx };

  const options: ShippingOption[] = zone.rates.map((rate) => {
    const totals = priceCart({
      lines,
      coupon,
      couponContext,
      shippingRate: {
        type: rate.type,
        baseRate: rate.baseRate,
        perKgRate: rate.perKgRate,
        freeAbove: rate.freeAbove,
      },
    });
    const window = estimateDeliveryWindow({
      now,
      cutoffHour: config.dispatchCutoffHour,
      minDays: rate.minDays,
      maxDays: rate.maxDays,
    });
    return {
      rateId: rate.id,
      name: rate.name,
      shippingTotal: totals.shippingTotal,
      grandTotal: totals.grandTotal,
      freeShipping: totals.shippingTotal === 0,
      reason: reasonFor({ totals, freeAbove: rate.freeAbove }).replace(
        "your coupon",
        totals.coupon?.code ?? "your coupon",
      ),
      deliveryWindow: formatDeliveryWindow(window),
      minDays: rate.minDays,
      maxDays: rate.maxDays,
    };
  });

  const cheapest = options[0]!;
  const zoneCod = pin ? pin.codAvailable : zone.codAvailable;
  const overLimit = cheapest.grandTotal > config.codLimit;
  const codAvailable = zoneCod && !overLimit;
  const codReason = codAvailable
    ? null
    : !zoneCod
      ? "Cash on delivery is not offered for this pincode."
      : `Cash on delivery is available on orders up to ${fmt(config.codLimit)}.`;

  return {
    status: "ok",
    pincode,
    city: pin?.city ?? null,
    state: pin?.state ?? null,
    zoneName: zone.name,
    codAvailable,
    codReason,
    codLimit: config.codLimit,
    options,
  };
}
