"use server";

import { getCatalogListing } from "@/lib/catalog/query";
import { resolveListingScope, type CatalogScope } from "@/lib/catalog/scope";
import type { ProductCardData } from "@/lib/queries/products";
import { parseCatalogParams } from "@/lib/search-params";

export type ListingPage = {
  items: ProductCardData[];
  page: number;
  pageCount: number;
  total: number;
};

/**
 * Next page for "Load more". `slug` names a collection listing; null means the
 * search page, whose scope is the `q` inside `query`. The URL string is parsed
 * by the same parser the page uses, so the client can never ask for a
 * combination the server would render differently.
 */
export async function loadListingPage(input: {
  slug: string | null;
  query: string;
}): Promise<ListingPage | null> {
  const slug = typeof input.slug === "string" ? input.slug.slice(0, 120) : null;
  const query = typeof input.query === "string" ? input.query.slice(0, 2048) : "";
  const params = parseCatalogParams(new URLSearchParams(query));

  let scope: CatalogScope | null = null;
  if (slug) {
    const listing = await resolveListingScope(slug);
    scope = listing?.scope ?? null;
  } else if (params.q) {
    scope = { kind: "search", q: params.q };
  }
  if (!scope) return null;

  const result = await getCatalogListing(scope, params);
  return {
    items: result.items,
    page: result.page,
    pageCount: result.pageCount,
    total: result.total,
  };
}
