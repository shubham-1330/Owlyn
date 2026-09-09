"use client";

import { Price } from "@/components/storefront/price";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Mobile bar that appears once the main purchase button scrolls away. The
 * button is inert until the bag lands in Phase 4 (see PROGRESS.md).
 */
export function StickyBar({
  visible,
  name,
  price,
  compareAtPrice,
  detail,
  canAdd,
}: {
  visible: boolean;
  name: string;
  price: number;
  compareAtPrice: number | null;
  detail: string;
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
        <Button disabled aria-disabled className="shrink-0" tabIndex={visible ? 0 : -1}>
          {canAdd ? "Add to bag" : "Select a size"}
        </Button>
      </div>
    </div>
  );
}
