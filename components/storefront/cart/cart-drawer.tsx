"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { Dialog, VisuallyHidden } from "radix-ui";

import { CartLines } from "@/components/storefront/cart/cart-lines";
import { CartNotices } from "@/components/storefront/cart/cart-notices";
import { useCart } from "@/components/storefront/cart/cart-provider";
import { CartSummary } from "@/components/storefront/cart/cart-summary";
import { CouponForm } from "@/components/storefront/cart/coupon-form";
import { FreeShippingBar } from "@/components/storefront/cart/free-shipping-bar";
import { UpsellRail } from "@/components/storefront/cart/upsell-rail";
import { Button } from "@/components/ui/button";

export function CartDrawer() {
  const cart = useCart();
  const view = cart.view;

  return (
    <Dialog.Root open={cart.isOpen} onOpenChange={cart.setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/70 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-ink text-foreground data-[state=closed]:animate-slide-out-right data-[state=open]:animate-slide-in-right"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
            <Dialog.Title className="font-display text-lg font-bold tracking-tight">
              Your bag
              <span
                className="ml-2 text-sm font-normal text-muted-foreground num"
                aria-live="polite"
              >
                {view.itemCount === 0
                  ? ""
                  : `${view.itemCount} ${view.itemCount === 1 ? "item" : "items"}`}
              </span>
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close bag"
              className="-mr-2 inline-flex size-10 items-center justify-center rounded-sm hover:bg-moon/10"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-5">
            <CartNotices className="pt-4" />
            {view.lines.length === 0 ? (
              <div className="flex flex-col gap-3 py-10">
                <p className="text-lg">Your bag is empty.</p>
                <p className="text-sm text-muted-foreground">
                  Anything you add waits here for 30 days.
                </p>
                <Dialog.Close asChild>
                  <Button variant="outline" className="w-fit">
                    Keep browsing
                  </Button>
                </Dialog.Close>
              </div>
            ) : (
              <>
                <CartLines lines={view.lines} compact />
                <div className="flex flex-col gap-5 border-t border-border py-5">
                  <FreeShippingBar cart={view} />
                  <CouponForm idPrefix="drawer-coupon" />
                </div>
                <div className="pb-6">
                  <UpsellRail products={view.upsell} />
                </div>
              </>
            )}
          </div>

          {view.lines.length > 0 ? (
            <div className="shrink-0 border-t border-border bg-slate px-5 py-4">
              <CartSummary cart={view} />
              <div className="mt-4 flex flex-col gap-2">
                <Button size="lg" asChild>
                  <Link href="/checkout" onClick={() => cart.setOpen(false)}>
                    Checkout
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/cart">View bag</Link>
                </Button>
              </div>
            </div>
          ) : null}
          <VisuallyHidden.Root>
            <Dialog.Description>Items you have added to your bag.</Dialog.Description>
          </VisuallyHidden.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
