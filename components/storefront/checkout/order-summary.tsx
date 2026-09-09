"use client";

import Image from "next/image";
import Link from "next/link";

import type { CartData } from "@/lib/cart/types";
import { formatINR } from "@/lib/money";
import type { ShippingOption } from "@/lib/orders/quote";

/**
 * Right-hand summary. Before a shipping option is chosen the shipping line
 * says so instead of showing a guess; once one is, every number is the
 * pricing engine's output for that exact option.
 */
export function CheckoutSummary({
  cart,
  option,
}: {
  cart: CartData;
  option: ShippingOption | null;
}) {
  const shipping = option ? option.shippingTotal : null;
  const total = option ? option.grandTotal : null;
  return (
    <div className="flex flex-col gap-5 border border-border bg-slate p-5">
      <h2 className="text-lg">Your bag</h2>
      <ul className="flex flex-col gap-3">
        {cart.lines.map((line) => (
          <li key={line.id} className="flex items-center gap-3">
            <div
              className="relative w-12 shrink-0 overflow-hidden bg-muted"
              style={{ aspectRatio: "3 / 4" }}
            >
              {line.image ? (
                <Image src={line.image.url} alt="" fill sizes="48px" className="object-cover" />
              ) : null}
              <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-moon text-[11px] font-medium text-ink num">
                {line.qty}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{line.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {line.colorName} · {line.size}
              </span>
            </div>
            <span className="text-sm num">{formatINR(line.net)}</span>
          </li>
        ))}
      </ul>
      <Link href="/cart" className="text-sm underline underline-offset-4 hover:text-primary">
        Edit bag
      </Link>
      <dl
        className="flex flex-col gap-2 border-t border-border pt-4 text-sm num"
        aria-live="polite"
      >
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
          <dt className="text-muted-foreground">{option ? option.name : "Shipping"}</dt>
          <dd>
            {shipping === null ? (
              <span className="text-muted-foreground">After address</span>
            ) : shipping === 0 ? (
              "Free"
            ) : (
              formatINR(shipping)
            )}
          </dd>
        </div>
        {option ? <p className="text-xs text-muted-foreground">{option.reason}</p> : null}
        <div className="flex justify-between text-xs text-muted-foreground">
          <dt>Includes GST</dt>
          <dd>{formatINR(cart.taxTotal)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
          <dt>Total</dt>
          <dd className="text-talon">
            {total === null ? formatINR(cart.subtotal - cart.discountTotal) : formatINR(total)}
          </dd>
        </div>
        {total === null ? <p className="text-xs text-muted-foreground">Before shipping.</p> : null}
      </dl>
    </div>
  );
}
