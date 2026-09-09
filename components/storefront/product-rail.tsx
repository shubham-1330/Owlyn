import { ProductCard } from "@/components/storefront/product-card";
import { SectionHeading } from "@/components/storefront/section-heading";
import { CONTAINER, GUTTER } from "@/lib/layout";
import type { ProductCardData } from "@/lib/queries/products";
import { cn } from "@/lib/utils";

/** Horizontal scroll-snap rail. Four cards per row on desktop, peeking cards on mobile. */
export function ProductRail({
  id,
  title,
  description,
  href,
  hrefLabel,
  products,
  priority = false,
}: {
  id: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  products: ProductCardData[];
  priority?: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <section className="py-16 md:py-24" aria-labelledby={`${id}-heading`}>
      <div className={cn(CONTAINER, GUTTER)}>
        <SectionHeading
          id={`${id}-heading`}
          title={title}
          description={description}
          href={href}
          hrefLabel={hrefLabel}
        />
      </div>
      <ul
        className={cn(
          CONTAINER,
          GUTTER,
          "mt-8 no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto md:scroll-px-8 xl:scroll-px-12",
        )}
      >
        {products.map((product, index) => (
          <li
            key={product.id}
            className="w-[68vw] shrink-0 snap-start sm:w-[44vw] lg:w-[calc((100%-3rem)/4)]"
          >
            <ProductCard
              product={product}
              priority={priority && index < 2}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 44vw, 68vw"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
