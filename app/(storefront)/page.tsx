import type { Metadata } from "next";
import { Suspense } from "react";

import { JsonLd } from "@/components/seo/json-ld";
import {
  CategoryTiles,
  categoryTilesConfigSchema,
} from "@/components/storefront/home/category-tiles";
import { CollectionBlock } from "@/components/storefront/home/collection-block";
import { EditorialSplit } from "@/components/storefront/home/editorial-split";
import { Hero } from "@/components/storefront/home/hero";
import { NewsletterSection } from "@/components/storefront/home/newsletter-section";
import { TrustStrip } from "@/components/storefront/home/trust-strip";
import { ProductRail } from "@/components/storefront/product-rail";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { getActiveBanners, getHomepageSections, type HomeSection } from "@/lib/queries/home";
import {
  getCollectionWithProducts,
  getFeaturedProducts,
  getNewProducts,
} from "@/lib/queries/products";
import { getStoreConfig, type StoreConfig } from "@/lib/queries/settings";
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME}. ${SITE_TAGLINE}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME}. ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "en_IN",
    type: "website",
  },
};

const BANNER_SLOTS = [
  "HERO",
  "HOME_SECONDARY",
  "EDITORIAL_MEN",
  "EDITORIAL_WOMEN",
  "PLP_TOP",
  "ANNOUNCEMENT",
] as const;
type Slot = (typeof BANNER_SLOTS)[number];

function isSlot(value: unknown): value is Slot {
  return typeof value === "string" && (BANNER_SLOTS as readonly string[]).includes(value);
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : fallback;
}

export default async function HomePage() {
  const [sections, config] = await Promise.all([getHomepageSections(), getStoreConfig()]);
  const hasHero = sections.some((s) => s.key === "hero");

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: config.name,
          legalName: config.legalName,
          url: absoluteUrl("/"),
          logo: absoluteUrl("/icon.svg"),
          email: config.supportEmail,
          address: {
            "@type": "PostalAddress",
            streetAddress: [config.address.line1, config.address.line2].filter(Boolean).join(", "),
            addressLocality: config.address.city,
            addressRegion: config.address.state,
            postalCode: config.address.pincode,
            addressCountry: "IN",
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: config.name,
          url: absoluteUrl("/"),
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: absoluteUrl("/search?q={search_term_string}"),
            },
            "query-input": "required name=search_term_string",
          },
        }}
      />
      {!hasHero ? <h1 className="sr-only">{config.name}</h1> : null}
      {sections.map((section) => (
        <Suspense key={section.key} fallback={<SectionFallback section={section} />}>
          <HomeSectionView section={section} config={config} />
        </Suspense>
      ))}
    </>
  );
}

async function HomeSectionView({ section, config }: { section: HomeSection; config: StoreConfig }) {
  switch (section.key) {
    case "hero": {
      const [banner] = await getActiveBanners("HERO");
      return banner ? <Hero banner={banner} /> : null;
    }
    case "featured-rail": {
      const products = await getFeaturedProducts(num(section.config.limit, 8));
      return (
        <ProductRail
          id="featured"
          title={section.title}
          href="/collections/bestsellers"
          hrefLabel="View bestsellers"
          products={products}
          priority
        />
      );
    }
    case "category-tiles": {
      const parsed = categoryTilesConfigSchema.safeParse(section.config);
      return parsed.success ? (
        <CategoryTiles title={section.title} tiles={parsed.data.tiles} />
      ) : null;
    }
    case "collection-block": {
      const slug = typeof section.config.collection === "string" ? section.config.collection : null;
      if (!slug) return null;
      const slot = isSlot(section.config.bannerSlot) ? section.config.bannerSlot : "HOME_SECONDARY";
      const [collection, banners] = await Promise.all([
        getCollectionWithProducts(slug, num(section.config.products, 4)),
        getActiveBanners(slot),
      ]);
      return collection ? (
        <CollectionBlock banner={banners[0] ?? null} collection={collection} />
      ) : null;
    }
    case "new-rail": {
      const products = await getNewProducts(
        num(section.config.limit, 8),
        num(section.config.days, 14),
      );
      return (
        <ProductRail
          id="new"
          title={section.title}
          href="/collections/new"
          hrefLabel="View all new"
          products={products}
        />
      );
    }
    case "editorial-split": {
      const slots = Array.isArray(section.config.slots)
        ? section.config.slots.filter(isSlot)
        : (["EDITORIAL_MEN", "EDITORIAL_WOMEN"] as Slot[]);
      const results = await Promise.all(slots.map((slot) => getActiveBanners(slot)));
      const banners = results
        .map((list) => list[0])
        .filter((b): b is NonNullable<typeof b> => Boolean(b));
      return <EditorialSplit banners={banners} />;
    }
    case "newsletter":
      return <NewsletterSection />;
    case "trust-strip":
      return <TrustStrip config={config} />;
    default:
      return null;
  }
}

function SectionFallback({ section }: { section: HomeSection }) {
  if (section.key === "hero") {
    return <div className="min-h-[78svh] bg-slate" aria-hidden />;
  }
  if (section.key === "newsletter" || section.key === "trust-strip") {
    return <div className="h-48" aria-hidden />;
  }
  return (
    <div className={cn(CONTAINER, GUTTER, "py-16 md:py-24")} aria-hidden>
      <div className="h-7 w-48 bg-slate" />
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-slate" />
        ))}
      </div>
    </div>
  );
}
