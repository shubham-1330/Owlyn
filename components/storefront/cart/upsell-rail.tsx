"use client";

import Image from "next/image";
import Link from "next/link";

import { QuickAdd } from "@/components/storefront/cart/quick-add";
import { formatINR } from "@/lib/money";
import type { ProductCardData } from "@/lib/queries/products";

/** Compact "goes with" rail for the drawer and the bag page. */
export function UpsellRail({
  products,
  title = "Goes with your bag",
}: {
  products: ProductCardData[];
  title?: string;
}) {
  if (products.length === 0) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h3 className="font-sans text-sm font-medium tracking-normal [font-stretch:normal]">
        {title}
      </h3>
      <ul className="-mx-1 no-scrollbar flex snap-x gap-3 overflow-x-auto px-1 pb-1">
        {products.map((product) => {
          const image = product.images[0];
          return (
            <li key={product.id} className="w-32 shrink-0 snap-start">
              <div className="relative">
                <Link
                  href={`/products/${product.slug}`}
                  className="relative block aspect-[3/4] overflow-hidden bg-slate"
                >
                  {image ? (
                    <Image
                      src={image.url}
                      alt={image.alt}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  ) : null}
                </Link>
                <QuickAdd product={product} className="absolute right-1.5 bottom-1.5" />
              </div>
              <Link
                href={`/products/${product.slug}`}
                className="mt-2 block truncate text-xs font-medium hover:text-primary"
              >
                {product.name}
              </Link>
              <p className="text-xs text-muted-foreground num">{formatINR(product.price)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
