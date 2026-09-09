"use client";

import type { CartData } from "@/lib/cart/types";
import { formatINR } from "@/lib/money";

export function CartSummary({ cart }: { cart: CartData }) {
  return (
    <dl className="flex flex-col gap-2 text-sm num" aria-live="polite">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd>{formatINR(cart.subtotal)}</dd>
      </div>
      {cart.discountTotal > 0 ? (
        <div className="flex justify-between">
          <dt className="text-muted-foreground">
            Discount{cart.coupon ? ` (${cart.coupon.code})` : ""}
          </dt>
          <dd className="text-success">−{formatINR(cart.discountTotal)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between">
        <dt className="text-muted-foreground">{cart.shippingLabel}</dt>
        <dd>
          {cart.shippingTotal === 0
            ? cart.lines.length
              ? "Free"
              : formatINR(0)
            : formatINR(cart.shippingTotal)}
        </dd>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <dt>Includes GST</dt>
        <dd>{formatINR(cart.taxTotal)}</dd>
      </div>
      <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
        <dt>Total</dt>
        <dd className="text-talon">{formatINR(cart.grandTotal)}</dd>
      </div>
    </dl>
  );
}
