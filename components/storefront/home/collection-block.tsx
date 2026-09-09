import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { CONTAINER, GUTTER } from "@/lib/layout";
import type { BannerData } from "@/lib/queries/home";
import type { CollectionSummary } from "@/lib/queries/products";
import { cn } from "@/lib/utils";

/** Editorial block: banner image on the left, copy plus four products on the right. */
export function CollectionBlock({
  banner,
  collection,
}: {
  banner: BannerData | null;
  collection: CollectionSummary;
}) {
  const href = banner?.ctaUrl ?? `/collections/${collection.slug}`;
  const image = banner?.image ?? collection.heroImage;
  const headline = banner?.headline ?? collection.name;
  const copy = banner?.subhead ?? collection.description;
  const ctaLabel = banner?.ctaLabel ?? `Shop ${collection.name}`;

  return (
    <section className="py-16 md:py-24" aria-labelledby="collection-block-heading">
      <div className={cn(CONTAINER, GUTTER, "grid gap-10 lg:grid-cols-2 lg:gap-16")}>
        <Link
          href={href}
          aria-label={headline}
          className="relative block aspect-[4/5] overflow-hidden bg-slate lg:aspect-auto lg:min-h-[640px]"
        >
          {image ? (
            <Image
              src={image}
              alt=""
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          ) : null}
        </Link>

        <div className="flex flex-col justify-center gap-8">
          <div className="flex flex-col gap-4">
            <h2 id="collection-block-heading" className="text-2xl md:text-3xl">
              {headline}
            </h2>
            {copy ? <p className="measure text-lg text-muted-foreground">{copy}</p> : null}
            <Button asChild variant="outline" size="lg" className="w-fit">
              <Link href={href}>{ctaLabel}</Link>
            </Button>
          </div>

          {collection.products.length > 0 ? (
            <ul className="grid grid-cols-2 gap-4 sm:gap-6">
              {collection.products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} sizes="(min-width: 1024px) 22vw, 45vw" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
