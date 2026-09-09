"use client";

import type { CartData } from "@/lib/cart/types";
import { formatINR } from "@/lib/money";

export function FreeShippingBar({ cart }: { cart: CartData }) {
  const threshold = cart.freeShippingThreshold;
  if (threshold === null || cart.lines.length === 0) return null;
  const unlocked = cart.freeShipping;
  const progress = unlocked
    ? 100
    : Math.min(100, Math.round(((threshold - cart.freeShippingRemaining) / threshold) * 100));

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm" aria-live="polite">
        {unlocked ? (
          <span className="text-success">Free shipping unlocked.</span>
        ) : (
          <>
            Add <span className="font-medium num">{formatINR(cart.freeShippingRemaining)}</span>{" "}
            more for free shipping.
          </>
        )}
      </p>
      <div
        role="progressbar"
        aria-label="Progress to free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className="h-1 w-full bg-muted"
      >
        <div
          className="h-full bg-talon transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
