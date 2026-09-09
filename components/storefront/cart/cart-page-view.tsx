"use client";

import Link from "next/link";

import { CartLines } from "@/components/storefront/cart/cart-lines";
import { CartNotices } from "@/components/storefront/cart/cart-notices";
import { useCart } from "@/components/storefront/cart/cart-provider";
import { CartSummary } from "@/components/storefront/cart/cart-summary";
import { CouponForm } from "@/components/storefront/cart/coupon-form";
import { FreeShippingBar } from "@/components/storefront/cart/free-shipping-bar";
import { UpsellRail } from "@/components/storefront/cart/upsell-rail";
import { EmptyState } from "@/components/storefront/empty-state";
import { Button } from "@/components/ui/button";

/** The full bag page. Same components as the drawer, laid out with room. */
export function CartPageView() {
  const cart = useCart();
  const view = cart.view;

  if (view.lines.length === 0) {
    return (
      <EmptyState
        title="Your bag is empty."
        description="Anything you add waits here, on this device, for 30 days."
        action={
          <Button asChild>
            <Link href="/collections/new">See what is new</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
      <div className="flex flex-col gap-4">
        <CartNotices />
        <CartLines lines={view.lines} />
        <div className="pt-6">
          <UpsellRail products={view.upsell} />
        </div>
      </div>
      <aside
        className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start"
        aria-label="Order summary"
      >
        <FreeShippingBar cart={view} />
        <CouponForm idPrefix="page-coupon" />
        <CartSummary cart={view} />
        <div className="flex flex-col gap-2">
          <Button size="lg" disabled title="Checkout opens in the next release">
            Checkout
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Checkout opens in the next release.
          </p>
        </div>
      </aside>
    </div>
  );
}
