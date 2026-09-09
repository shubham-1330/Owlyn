import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { EmptyState } from "@/components/storefront/empty-state";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth/guards";
import { getCartToken } from "@/lib/cart/cookies";
import { db } from "@/lib/db";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { formatINR, sumPaise } from "@/lib/money";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false },
};

/** Read-only bag view. Quantity changes, coupons and checkout arrive in Phases 4 and 5. */
export default async function CartPage() {
  const [user, token] = await Promise.all([getSessionUser(), getCartToken()]);
  const where = user ? { userId: user.id } : token ? { token } : null;
  const cart = where
    ? await db.cart.findFirst({
        where,
        select: {
          items: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              qty: true,
              variant: {
                select: {
                  size: true,
                  colorName: true,
                  price: true,
                  product: {
                    select: {
                      name: true,
                      slug: true,
                      basePrice: true,
                      images: {
                        orderBy: { position: "asc" },
                        take: 1,
                        select: { url: true, alt: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      })
    : null;

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className={cn(CONTAINER, GUTTER, "py-12 md:py-16")}>
        <h1 className="text-2xl md:text-3xl">Your bag</h1>
        <EmptyState
          title="Your bag is empty."
          description="Anything you add will wait here, on this device, for 30 days."
          action={
            <Button asChild>
              <Link href="/">Back to the store</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const lines = items.map((item) => {
    const unit = item.variant.price ?? item.variant.product.basePrice;
    return { ...item, unit, total: unit * item.qty };
  });
  const subtotal = sumPaise(lines.map((line) => line.total));

  return (
    <div className={cn(CONTAINER, GUTTER, "flex flex-col gap-8 py-12 md:py-16")}>
      <h1 className="text-2xl md:text-3xl">Your bag</h1>
      <ul className="flex max-w-3xl flex-col gap-6">
        {lines.map((line) => {
          const image = line.variant.product.images[0];
          return (
            <li key={line.id} className="flex gap-4">
              <Link
                href={`/products/${line.variant.product.slug}`}
                className="relative block w-24 shrink-0 overflow-hidden bg-slate"
                style={{ aspectRatio: "3 / 4" }}
              >
                {image ? (
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : null}
              </Link>
              <div className="flex flex-1 flex-col gap-1">
                <Link
                  href={`/products/${line.variant.product.slug}`}
                  className="font-medium hover:text-primary"
                >
                  {line.variant.product.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {line.variant.colorName} · {line.variant.size} · Qty {line.qty}
                </p>
              </div>
              <p className="font-medium num">{formatINR(line.total)}</p>
            </li>
          );
        })}
      </ul>
      <div className="flex max-w-3xl items-baseline justify-between border-t border-border pt-6">
        <p className="text-muted-foreground">Subtotal</p>
        <p className="text-lg font-medium num">{formatINR(subtotal)}</p>
      </div>
    </div>
  );
}
