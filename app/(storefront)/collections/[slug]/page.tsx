import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { ListingView } from "@/components/storefront/plp/listing-view";
import { getCatalogListing } from "@/lib/catalog/query";
import { resolveListingScope } from "@/lib/catalog/scope";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { isIndexable, parseCatalogParams, type RawSearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  // Deciding here, before the loading boundary streams, is what makes the 404 a real 404.
  const listing = await resolveListingScope(slug);
  if (!listing) notFound();
  const parsed = parseCatalogParams(raw);
  const indexable = isIndexable(parsed);
  return {
    title: listing.metaTitle ? { absolute: listing.metaTitle } : listing.headline,
    description: listing.metaDescription ?? listing.description ?? undefined,
    // Filtered and paginated variants all point at the bare listing.
    alternates: { canonical: listing.path },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: listing.heroImage ? { images: [{ url: listing.heroImage }] } : undefined,
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const listing = await resolveListingScope(slug);
  if (!listing) notFound();

  const parsed = parseCatalogParams(raw);
  const result = await getCatalogListing(listing.scope, parsed);

  return (
    <div className={cn(CONTAINER, GUTTER, "flex flex-col gap-8 py-8 md:py-12")}>
      <header className="flex flex-col gap-4">
        <Breadcrumbs items={listing.breadcrumbs} />
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl md:text-3xl">{listing.headline}</h1>
          {listing.description ? (
            <p className="measure text-muted-foreground">{listing.description}</p>
          ) : null}
        </div>
      </header>

      <ListingView
        slug={listing.slug}
        path={listing.path}
        params={parsed}
        result={result}
        genderLocked={listing.genderLocked}
        categoryLocked={listing.categoryLocked}
        emptyTitle="Nothing matches these filters."
        emptyDescription="Loosen one of them, or clear all to see everything in this listing."
      />
    </div>
  );
}
