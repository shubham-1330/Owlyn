"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { loadListingPage } from "@/app/(storefront)/collections/actions";
import { ProductCard } from "@/components/storefront/product-card";
import { Button } from "@/components/ui/button";
import type { ProductCardData } from "@/lib/queries/products";
import { catalogHref, serializeCatalogParams, type CatalogParams } from "@/lib/search-params";

const AUTO_LOAD_PAGES = 2;

/**
 * Renders the server's page and appends further pages on demand. "Load more"
 * is a real link to `?page=n+1`, enhanced to fetch in place and move the URL
 * with replaceState so the position survives a refresh. The first two extra
 * pages load as the sentinel scrolls into view; after that it takes a click.
 */
export function ProductGrid({
  slug,
  path,
  params,
  initialItems,
  initialPage,
  pageCount,
  total,
}: {
  slug: string | null;
  path: string;
  params: CatalogParams;
  initialItems: ProductCardData[];
  initialPage: number;
  pageCount: number;
  total: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(initialPage);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const autoLoads = useRef(0);
  const sentinel = useRef<HTMLDivElement>(null);
  const firstNewItem = useRef<HTMLLIElement>(null);
  const appendedAt = useRef<number | null>(null);

  useEffect(() => {
    setItems(initialItems);
    setPage(initialPage);
    setError(null);
    autoLoads.current = 0;
  }, [initialItems, initialPage]);

  const hasMore = page < pageCount;
  const nextParams = useMemo<CatalogParams>(() => ({ ...params, page: page + 1 }), [params, page]);
  const nextHref = useMemo(
    () => catalogHref(path, nextParams, { keepPage: true }),
    [path, nextParams],
  );

  const loadNext = useCallback(() => {
    if (!hasMore || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await loadListingPage({
        slug,
        query: serializeCatalogParams(nextParams, { omitQuery: false }),
      });
      if (!result) {
        setError("Could not load more products. Try the link instead.");
        return;
      }
      appendedAt.current = items.length;
      setItems((current) => [...current, ...result.items]);
      setPage(result.page);
      window.history.replaceState(window.history.state, "", nextHref);
    });
  }, [hasMore, pending, slug, nextParams, items.length, nextHref]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && autoLoads.current < AUTO_LOAD_PAGES && !pending) {
        autoLoads.current += 1;
        loadNext();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadNext, pending]);

  useEffect(() => {
    if (appendedAt.current !== null && firstNewItem.current) {
      firstNewItem.current.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
      appendedAt.current = null;
    }
  }, [items]);

  return (
    <div className="flex flex-col gap-10">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
        {items.map((product, index) => (
          <li key={product.id} ref={index === appendedAt.current ? firstNewItem : undefined}>
            <ProductCard
              product={product}
              priority={index < 4}
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
            />
          </li>
        ))}
      </ul>

      <div ref={sentinel} className="flex flex-col items-center gap-3">
        <p className="text-sm text-muted-foreground num" aria-live="polite">
          Showing {items.length} of {total}
        </p>
        {error ? (
          <p className="text-sm text-alert-2" role="alert">
            {error}
          </p>
        ) : null}
        {hasMore ? (
          <Button asChild variant="outline" disabled={pending}>
            <a
              href={nextHref}
              onClick={(event) => {
                event.preventDefault();
                loadNext();
              }}
              aria-busy={pending}
            >
              {pending ? "Loading" : "Load more"}
            </a>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
