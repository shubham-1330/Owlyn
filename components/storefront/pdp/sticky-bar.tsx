"use client";

import { AddToBagButton } from "@/components/storefront/cart/add-to-bag-button";
import { Price } from "@/components/storefront/price";
import { cn } from "@/lib/utils";

/** Mobile bar that appears once the main purchase button scrolls away. Same add action as the panel. */
export function StickyBar({
  visible,
  name,
  price,
  compareAtPrice,
  detail,
  variantId,
  canAdd,
}: {
  visible: boolean;
  name: string;
  price: number;
  compareAtPrice: number | null;
  detail: string;
  variantId: string | null;
  canAdd: boolean;
}) {
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-border bg-slate/95 backdrop-blur-sm transition-transform duration-200 lg:hidden",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-3">
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {detail ? `${detail} · ` : ""}
            <Price price={price} compareAtPrice={compareAtPrice} className="text-xs" />
          </p>
        </div>
        <AddToBagButton
          variantId={canAdd ? variantId : null}
          size="default"
          label={canAdd ? "Add to bag" : variantId ? "Sold out" : "Select a size"}
          className="shrink-0"
        />
      </div>
    </div>
  );
}
