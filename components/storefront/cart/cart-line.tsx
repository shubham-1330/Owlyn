"use client";

import { Minus, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { useCart } from "@/components/storefront/cart/cart-provider";
import { Badge } from "@/components/ui/badge";
import type { CartLineData } from "@/lib/cart/types";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

const stepButton =
  "inline-flex size-9 items-center justify-center text-foreground transition-colors hover:bg-moon/10 disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring";

export function CartLine({ line, compact = false }: { line: CartLineData; compact?: boolean }) {
  const cart = useCart();
  const href = `/products/${line.slug}`;
  const atMax = line.qty >= line.maxQty;

  return (
    <li className="flex gap-4 py-5">
      <Link
        href={href}
        className={cn(
          "relative block shrink-0 overflow-hidden bg-slate",
          compact ? "w-20" : "w-24 sm:w-28",
        )}
        style={{ aspectRatio: "3 / 4" }}
      >
        {line.image ? (
          <Image
            src={line.image.url}
            alt={line.image.alt}
            fill
            sizes="112px"
            placeholder={line.image.blurData ? "blur" : "empty"}
            blurDataURL={line.image.blurData ?? undefined}
            className={cn("object-cover", !line.available && "opacity-60")}
          />
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link href={href} className="block truncate font-medium hover:text-primary">
              {line.name}
            </Link>
            <p className="text-sm text-muted-foreground">
              {line.colorName} · {line.size}
            </p>
          </div>
          <p className="shrink-0 text-sm font-medium num">{formatINR(line.net)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {line.discount > 0 ? (
            <span className="text-xs text-muted-foreground num line-through">
              {formatINR(line.lineTotal)}
            </span>
          ) : null}
          {line.priceChanged ? <Badge variant="outline">Price updated</Badge> : null}
          {!line.available ? (
            <Badge variant="alert">Sold out</Badge>
          ) : line.qty > line.stock ? (
            <Badge variant="alert">Only {line.stock} left</Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            className="inline-flex items-center rounded-sm border border-border"
            role="group"
            aria-label={`Quantity of ${line.name}, ${line.size}`}
          >
            <button
              type="button"
              className={stepButton}
              onClick={() => cart.updateQty(line.id, line.qty - 1)}
              aria-label={line.qty === 1 ? "Remove" : "Decrease quantity"}
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="w-8 text-center text-sm num" aria-live="polite">
              {line.qty}
            </span>
            <button
              type="button"
              className={stepButton}
              onClick={() => cart.updateQty(line.id, line.qty + 1)}
              disabled={atMax || !line.available}
              aria-label="Increase quantity"
              title={atMax ? `Up to ${line.maxQty} available` : undefined}
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => cart.moveToWishlist(line.id)}
              className="underline underline-offset-4 hover:text-primary"
            >
              Move to wishlist
            </button>
            <button
              type="button"
              onClick={() => cart.remove(line.id)}
              className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
