import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { ProductAccordions } from "@/components/storefront/pdp/product-accordions";
import { ProductView } from "@/components/storefront/pdp/product-view";
import { ReviewsSection } from "@/components/storefront/pdp/reviews-section";
import { ProductRail } from "@/components/storefront/product-rail";
import { getSessionUser } from "@/lib/auth/guards";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { getProductDetail } from "@/lib/queries/product";
import { getStoreConfig } from "@/lib/queries/settings";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ color?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Deciding here, before the loading boundary streams, is what makes the 404 a real 404.
  const product = await getProductDetail(slug);
  if (!product) notFound();
  const image = product.media.find((m) => m.kind === "IMAGE");
  return {
    title: product.metaTitle ? { absolute: product.metaTitle } : product.name,
    description: product.metaDescription ?? product.shortDescription,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description: product.shortDescription,
      url: `/products/${slug}`,
      images: image ? [{ url: image.url, alt: image.alt }] : undefined,
    },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const product = await getProductDetail(slug);
  if (!product) notFound();

  const [user, config] = await Promise.all([getSessionUser(), getStoreConfig()]);
  const initialColor = typeof raw.color === "string" ? raw.color.toLowerCase() : null;

  const crumbs = [
    { label: "Home", href: "/" },
    ...product.categoryChain.map((c) => ({ label: c.name, href: `/collections/${c.slug}` })),
    { label: product.name, href: `/products/${product.slug}` },
  ];

  const prices = product.variants.map((v) => v.price);
  const inStock = product.variants.some((v) => v.stock > 0);
  const average = product.reviewCount > 0 ? product.ratingSum / product.reviewCount : null;

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          image: product.media.filter((m) => m.kind === "IMAGE").map((m) => absoluteUrl(m.url)),
          description: product.shortDescription,
          sku: product.variants[0]?.sku,
          brand: { "@type": "Brand", name: SITE_NAME },
          category: product.categoryChain.map((c) => c.name).join(" > "),
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: (Math.min(...prices) / 100).toFixed(2),
            highPrice: (Math.max(...prices) / 100).toFixed(2),
            offerCount: product.variants.length,
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: absoluteUrl(`/products/${product.slug}`),
          },
          ...(average !== null
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: average.toFixed(1),
                  reviewCount: product.reviewCount,
                  bestRating: 5,
                  worstRating: 1,
                },
              }
            : {}),
        }}
      />

      <div className={cn(CONTAINER, GUTTER, "flex flex-col gap-12 py-6 pb-28 md:py-10 lg:pb-16")}>
        <Breadcrumbs items={crumbs} />

        <ProductView
          product={{
            id: product.id,
            slug: product.slug,
            name: product.name,
            brandLine: product.brandLine,
            shortDescription: product.shortDescription,
            basePrice: product.basePrice,
            compareAtPrice: product.compareAtPrice,
            badges: product.badges,
            reviewCount: product.reviewCount,
            ratingSum: product.ratingSum,
            variants: product.variants,
            media: product.media,
            sizeChart: product.sizeChart,
          }}
          initialColor={initialColor}
          defaultEmail={user?.email ?? null}
        />

        <div className="max-w-3xl">
          <ProductAccordions product={product} config={config} />
        </div>

        <ReviewsSection product={product} />
      </div>

      {product.related.length > 0 ? (
        <ProductRail id="complete-the-look" title="Complete the look" products={product.related} />
      ) : null}
      {product.similar.length > 0 ? (
        <ProductRail id="you-may-also-like" title="You may also like" products={product.similar} />
      ) : null}
    </>
  );
}
