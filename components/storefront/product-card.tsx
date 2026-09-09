import Image from "next/image";
import Link from "next/link";

import { QuickAdd } from "@/components/storefront/cart/quick-add";
import { Price } from "@/components/storefront/price";
import { WishlistButton } from "@/components/storefront/wishlist/wishlist-button";
import { Badge } from "@/components/ui/badge";
import { BADGE_LABEL, BADGE_VARIANT } from "@/lib/catalog/badges";
import type { ProductCardData } from "@/lib/queries/products";
import { cn } from "@/lib/utils";

/**
 * 3:4 image, square corners, second image on hover (desktop only), name,
 * price with MRP strike-through, brand line and colour count. Wishlist heart
 * top-right; quick add bottom-right, always visible on touch, on hover or
 * focus elsewhere.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  className,
}: {
  product: ProductCardData;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const [first, second] = product.images;
  const href = `/products/${product.slug}`;

  return (
    <article className={cn("group flex flex-col gap-3", className)}>
      <div className="relative">
        <Link
          href={href}
          aria-label={product.name}
          className="relative block aspect-[3/4] overflow-hidden bg-slate"
        >
          {first ? (
            <Image
              src={first.url}
              alt={first.alt}
              fill
              sizes={sizes}
              priority={priority}
              placeholder={first.blurData ? "blur" : "empty"}
              blurDataURL={first.blurData ?? undefined}
              className={cn(
                "object-cover",
                second && "md:transition-opacity md:duration-200 md:group-hover:opacity-0",
                !product.inStock && "opacity-70",
              )}
            />
          ) : null}
          {second ? (
            <Image
              src={second.url}
              alt=""
              aria-hidden
              fill
              sizes={sizes}
              className="hidden object-cover opacity-0 md:block md:transition-opacity md:duration-200 md:group-hover:opacity-100"
            />
          ) : null}
          {product.badges.length > 0 ? (
            <div className="absolute top-2 left-2 flex gap-1">
              {product.badges.slice(0, 2).map((badge) => (
                <Badge key={badge} variant={BADGE_VARIANT[badge]}>
                  {BADGE_LABEL[badge]}
                </Badge>
              ))}
            </div>
          ) : null}
        </Link>
        <WishlistButton
          productId={product.id}
          productName={product.name}
          size="sm"
          className="absolute top-2 right-2"
        />
        <QuickAdd
          product={product}
          className="absolute right-2 bottom-2 md:opacity-0 md:transition-opacity md:group-focus-within:opacity-100 md:group-hover:opacity-100"
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-sans text-sm leading-snug font-medium tracking-normal [font-stretch:normal]">
            <Link href={href} className="hover:text-primary">
              {product.name}
            </Link>
          </h3>
          <Price
            price={product.price}
            compareAtPrice={product.compareAtPrice}
            className="shrink-0"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {product.brandLine}
          {product.colorCount > 1 ? ` · ${product.colorCount} colours` : ""}
        </p>
      </div>
    </article>
  );
}
