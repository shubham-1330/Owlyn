"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import {
  removeWishlistAction,
  wishlistCardsAction,
} from "@/app/(storefront)/account/wishlist/actions";
import { AddToBagButton } from "@/components/storefront/cart/add-to-bag-button";
import { QuickAdd } from "@/components/storefront/cart/quick-add";
import { EmptyState } from "@/components/storefront/empty-state";
import { NotifyForm } from "@/components/storefront/pdp/notify-form";
import { Price } from "@/components/storefront/price";
import { useWishlist } from "@/components/storefront/wishlist/wishlist-provider";
import { Button } from "@/components/ui/button";
import type { ProductCardData } from "@/lib/queries/products";
import type { WishlistProduct } from "@/lib/wishlist/service";

type Row = { card: ProductCardData; variant: WishlistProduct["variant"]; variantId: string | null };

/**
 * Signed-in users get rows from the server; guests build them from the
 * browser list. Move to bag adds a saved variant directly, offers sizes
 * otherwise, and shows notify-me on sold-out items.
 */
export function WishlistPageView({
  initial,
  defaultEmail,
}: {
  initial: WishlistProduct[] | null;
  defaultEmail?: string | null;
}) {
  const wishlist = useWishlist();
  const [rows, setRows] = useState<Row[]>(
    initial
      ? initial.map((i) => ({ card: i.card, variant: i.variant, variantId: i.entry.variantId }))
      : [],
  );
  const [loading, setLoading] = useState(!initial);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    wishlistCardsAction({ productIds: wishlist.entries.map((e) => e.productId) })
      .then((cards) => {
        if (cancelled) return;
        setRows(
          cards.map((card) => {
            const entry = wishlist.entries.find((e) => e.productId === card.id);
            const variant = entry?.variantId
              ? (card.variants ?? []).find((v) => v.id === entry.variantId)
              : undefined;
            return { card, variant: variant ?? null, variantId: entry?.variantId ?? null };
          }),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [initial, wishlist.entries]);

  const remove = (productId: string) => {
    setRows((current) => current.filter((r) => r.card.id !== productId));
    wishlist.remove(productId);
    if (wishlist.isSignedIn)
      startTransition(() => removeWishlistAction({ productId }).then(() => undefined));
  };

  if (loading) {
    return (
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4" aria-busy>
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="flex flex-col gap-3">
            <div className="aspect-[3/4] bg-slate" />
            <div className="h-4 w-3/4 bg-slate" />
          </li>
        ))}
      </ul>
    );
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing saved yet."
        description="Tap the heart on any product and it will wait here."
        action={
          <Button asChild>
            <Link href="/collections/bestsellers">See bestsellers</Link>
          </Button>
        }
        className="py-6"
      />
    );
  }

  return (
    <ul
      className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy={pending}
    >
      {rows.map(({ card, variant, variantId }) => {
        const image = card.images[0];
        const soldOut = variant ? variant.stock <= 0 : !card.inStock;
        return (
          <li key={card.id} className="flex gap-4">
            <Link
              href={`/products/${card.slug}`}
              className="relative block w-28 shrink-0 overflow-hidden border border-border bg-slate"
              style={{ aspectRatio: "3 / 4" }}
            >
              {image ? (
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : null}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div>
                <Link
                  href={`/products/${card.slug}`}
                  className="block truncate font-medium hover:text-primary"
                >
                  {card.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {variant ? `${variant.colorName} · ${variant.size}` : card.brandLine}
                </p>
                <Price price={card.price} compareAtPrice={card.compareAtPrice} className="mt-1" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {soldOut ? null : variant ? (
                  <AddToBagButton
                    variantId={variant.id}
                    size="sm"
                    label="Move to bag"
                    onAdded={() => remove(card.id)}
                  />
                ) : (
                  <span className="inline-flex items-center gap-2 text-sm">
                    <QuickAdd product={card} />
                    Choose a size
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remove(card.id)}
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Remove
                </button>
              </div>
              {soldOut && variant ? (
                <NotifyForm
                  variantId={variant.id}
                  sizeLabel={`${variant.colorName}, ${variant.size}`}
                  defaultEmail={defaultEmail}
                />
              ) : null}
              {soldOut && !variant && variantId === null ? (
                <p className="text-sm text-muted-foreground">
                  Sold out. Open the product to be notified for a size.
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
