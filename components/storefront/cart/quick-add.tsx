"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { Popover } from "radix-ui";
import { useState } from "react";

import { useCart } from "@/components/storefront/cart/cart-provider";
import type { ProductCardData } from "@/lib/queries/products";
import { cn } from "@/lib/utils";

/**
 * Quick add from a product card. One purchasable option adds straight away;
 * otherwise a small size picker for the pictured colour, with a link to the
 * product page for the rest.
 */
export function QuickAdd({ product, className }: { product: ProductCardData; className?: string }) {
  const cart = useCart();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const variants = product.variants ?? [];
  const purchasable = variants.filter((v) => v.stock > 0);
  if (purchasable.length === 0) return null;

  const firstColor = purchasable[0]!.colorName;
  const sizes = variants.filter((v) => v.colorName === firstColor);
  const single = sizes.length === 1 && purchasable.length === 1 ? purchasable[0]! : null;

  const add = async (variantId: string) => {
    setBusy(true);
    await cart.add({ variantId });
    setBusy(false);
    setOpen(false);
  };

  const trigger = (
    <button
      type="button"
      aria-label={single ? `Add ${product.name} to bag` : `Choose a size of ${product.name}`}
      disabled={busy}
      onClick={
        single
          ? (event) => {
              event.preventDefault();
              void add(single.id);
            }
          : undefined
      }
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-sm bg-moon text-ink transition-colors hover:bg-talon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60",
        className,
      )}
    >
      <Plus className="size-4" aria-hidden />
    </button>
  );

  if (single) return trigger;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-40 w-56 border border-border bg-slate p-3 text-foreground data-[state=open]:animate-fade-in"
        >
          <p className="mb-2 text-xs text-muted-foreground">
            {product.name} · {firstColor}
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {sizes.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock <= 0 || busy}
                onClick={() => void add(v.id)}
                className={cn(
                  "h-9 rounded-sm border border-border text-xs num transition-colors hover:border-foreground disabled:text-muted-foreground disabled:line-through disabled:hover:border-border",
                )}
              >
                {v.size}
              </button>
            ))}
          </div>
          {product.colorCount > 1 ? (
            <Link
              href={`/products/${product.slug}`}
              className="mt-3 block text-xs underline underline-offset-4 hover:text-primary"
            >
              More colours
            </Link>
          ) : null}
          <Popover.Arrow className="fill-border" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
