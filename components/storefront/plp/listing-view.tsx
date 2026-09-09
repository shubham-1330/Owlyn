import Link from "next/link";

import { EmptyState } from "@/components/storefront/empty-state";
import { ActiveChips } from "@/components/storefront/plp/active-chips";
import { Filters } from "@/components/storefront/plp/filters";
import { MobileFilters } from "@/components/storefront/plp/mobile-filters";
import { Pagination } from "@/components/storefront/plp/pagination";
import { ProductGrid } from "@/components/storefront/plp/product-grid";
import { SortSelect } from "@/components/storefront/plp/sort-select";
import type { CatalogResult } from "@/lib/catalog/query";
import {
  activeDimensions,
  catalogHref,
  clearFilters,
  type CatalogParams,
} from "@/lib/search-params";

/** Shared body of the PLP and the search page: toolbar, chips, sidebar, grid, pagination. */
export function ListingView({
  slug,
  path,
  params,
  result,
  genderLocked,
  categoryLocked,
  emptyTitle,
  emptyDescription,
}: {
  slug: string | null;
  path: string;
  params: CatalogParams;
  result: CatalogResult;
  genderLocked: boolean;
  categoryLocked: boolean;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const activeCount = activeDimensions(params).length;
  const filters = (
    <Filters
      params={params}
      facets={result.facets}
      path={path}
      genderLocked={genderLocked}
      categoryLocked={categoryLocked}
    />
  );
  const from = result.total === 0 ? 0 : (params.page - 1) * result.pageSize + 1;
  const to = Math.min(result.total, params.page * result.pageSize);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground num" aria-live="polite">
          {result.total === 0
            ? "No products"
            : result.total === 1
              ? "1 product"
              : params.page > 1
                ? `${from} to ${to} of ${result.total} products`
                : `${result.total} products`}
        </p>
        <div className="flex items-center gap-3">
          <MobileFilters activeCount={activeCount}>{filters}</MobileFilters>
          <SortSelect path={path} params={params} />
        </div>
      </div>

      <ActiveChips params={params} facets={result.facets} path={path} />

      <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="pr-2">{filters}</div>
        </aside>

        <div className="min-w-0">
          {result.items.length === 0 ? (
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              action={
                activeCount > 0 ? (
                  <Link
                    href={catalogHref(path, clearFilters(params))}
                    className="text-sm underline underline-offset-4 hover:text-primary"
                  >
                    Clear all filters
                  </Link>
                ) : null
              }
              className="py-8"
            />
          ) : (
            <>
              <ProductGrid
                slug={slug}
                path={path}
                params={params}
                initialItems={result.items}
                initialPage={result.page}
                pageCount={result.pageCount}
                total={result.total}
              />
              <div className="pt-10">
                <Pagination path={path} params={params} pageCount={result.pageCount} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
