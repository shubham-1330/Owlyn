"use client";

import { CartLine } from "@/components/storefront/cart/cart-line";
import type { CartLineData } from "@/lib/cart/types";

export function CartLines({
  lines,
  compact = false,
}: {
  lines: CartLineData[];
  compact?: boolean;
}) {
  return (
    <ul className="divide-y divide-border" aria-label="Items in your bag">
      {lines.map((line) => (
        <CartLine key={line.id} line={line} compact={compact} />
      ))}
    </ul>
  );
}
