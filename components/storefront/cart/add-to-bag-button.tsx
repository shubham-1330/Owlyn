"use client";

import { useState } from "react";

import { useCart } from "@/components/storefront/cart/cart-provider";
import { Button } from "@/components/ui/button";

/** The one real add-to-bag control. Used by the PDP, its sticky bar, quick add and the wishlist. */
export function AddToBagButton({
  variantId,
  qty = 1,
  disabled = false,
  label = "Add to bag",
  size = "lg",
  variant = "default",
  className,
  onAdded,
}: {
  variantId: string | null;
  qty?: number;
  disabled?: boolean;
  label?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline" | "secondary";
  className?: string;
  onAdded?: () => void;
}) {
  const cart = useCart();
  const [busy, setBusy] = useState(false);

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      disabled={disabled || !variantId || busy}
      aria-busy={busy}
      onClick={async () => {
        if (!variantId) return;
        setBusy(true);
        const ok = await cart.add({ variantId, qty });
        setBusy(false);
        if (ok) onAdded?.();
      }}
    >
      {busy ? "Adding" : label}
    </Button>
  );
}
