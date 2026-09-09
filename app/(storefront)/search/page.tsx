import type { Metadata } from "next";
import Link from "next/link";

import { ListingView } from "@/components/storefront/plp/listing-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCatalogListing } from "@/lib/catalog/query";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { getStoreConfig } from "@/lib/queries/settings";
import { parseCatalogParams, type RawSearchParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = parseCatalogParams(await searchParams);
  return {
    title: q ? `Search: ${q}` : "Search",
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const parsed = parseCatalogParams(await searchParams);
  const [result, config] = await Promise.all([
    parsed.q ? getCatalogListing({ kind: "search", q: parsed.q }, parsed) : Promise.resolve(null),
    getStoreConfig(),
  ]);

  return (
    <div className={cn(CONTAINER, GUTTER, "flex flex-col gap-8 py-8 md:py-12")}>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl md:text-3xl">
          {parsed.q ? `Results for “${parsed.q}”` : "Search the store"}
        </h1>
        <form role="search" action="/search" className="flex w-full max-w-xl gap-2">
          <Input
            type="search"
            name="q"
            defaultValue={parsed.q}
            placeholder="Search products"
            aria-label="Search products"
            autoComplete="off"
          />
          <Button type="submit" className="shrink-0">
            Search
          </Button>
        </form>
      </div>

      {result ? (
        <ListingView
          slug={null}
          path="/search"
          params={parsed}
          result={result}
          genderLocked={false}
          categoryLocked={false}
          emptyTitle="Nothing matched."
          emptyDescription="Try a product name like Court 1 or Strider, or a type like joggers or run cap. Filters narrow results further."
        />
      ) : config.trendingSearches.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Trending</p>
          <ul className="flex flex-wrap gap-2">
            {config.trendingSearches.map((term) => (
              <li key={term}>
                <Link
                  href={`/search?q=${encodeURIComponent(term)}`}
                  className="inline-block rounded-sm border border-border px-3 py-1.5 text-sm transition-colors hover:border-foreground"
                >
                  {term}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
