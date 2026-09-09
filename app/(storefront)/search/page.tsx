import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/storefront/empty-state";
import { ProductCard } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { normaliseSearchQuery, searchProducts } from "@/lib/queries/search";
import { getStoreConfig } from "@/lib/queries/settings";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{ q?: string | string[] }>;

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const q = normaliseSearchQuery(firstParam((await searchParams).q));
  return {
    title: q ? `Search: ${q}` : "Search",
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const q = normaliseSearchQuery(firstParam((await searchParams).q));
  const [results, config] = await Promise.all([
    q ? searchProducts(q) : Promise.resolve([]),
    getStoreConfig(),
  ]);

  return (
    <div className={cn(CONTAINER, GUTTER, "flex flex-col gap-8 py-12 md:py-16")}>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl md:text-3xl">{q ? "Search" : "Search the store"}</h1>
        <form role="search" action="/search" className="flex w-full max-w-xl gap-2">
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search products"
            aria-label="Search products"
            autoComplete="off"
          />
          <Button type="submit" className="shrink-0">
            Search
          </Button>
        </form>
      </div>

      {q ? (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {results.length === 0
              ? `No results for “${q}”`
              : `${results.length} ${results.length === 1 ? "result" : "results"} for “${q}”`}
          </p>
          {results.length > 0 ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
              {results.map((product, index) => (
                <li key={product.id}>
                  <ProductCard product={product} priority={index < 4} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Nothing matched."
              description="Try a product name like Court 1 or Strider, or a type like joggers or run cap."
              action={
                config.trendingSearches.length > 0 ? (
                  <TrendingLinks terms={config.trendingSearches} />
                ) : null
              }
              className="py-6"
            />
          )}
        </>
      ) : config.trendingSearches.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Trending</p>
          <TrendingLinks terms={config.trendingSearches} />
        </div>
      ) : null}
    </div>
  );
}

function TrendingLinks({ terms }: { terms: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {terms.map((term) => (
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
  );
}
