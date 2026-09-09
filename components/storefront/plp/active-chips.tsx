import { X } from "lucide-react";
import Link from "next/link";

import type { CatalogFacets } from "@/lib/catalog/query";
import { formatINR } from "@/lib/money";
import {
  catalogHref,
  clearFilters,
  hasActiveFilters,
  toggleListValue,
  withParams,
  type CatalogParams,
  type ListDimension,
} from "@/lib/search-params";

type Chip = { key: string; label: string; href: string };

const LIST_DIMENSIONS: Array<{ key: ListDimension; prefix: string }> = [
  { key: "category", prefix: "" },
  { key: "size", prefix: "Size " },
  { key: "color", prefix: "" },
  { key: "gender", prefix: "" },
  { key: "activity", prefix: "" },
  { key: "brand", prefix: "" },
];

function priceLabel(range: NonNullable<CatalogParams["price"]>): string {
  if (range.min !== undefined && range.max !== undefined)
    return `${formatINR(range.min)} to ${formatINR(range.max)}`;
  if (range.min !== undefined) return `Over ${formatINR(range.min)}`;
  if (range.max !== undefined) return `Under ${formatINR(range.max)}`;
  return "Price";
}

export function buildChips(params: CatalogParams, facets: CatalogFacets, path: string): Chip[] {
  const chips: Chip[] = [];
  for (const { key, prefix } of LIST_DIMENSIONS) {
    for (const value of params[key]) {
      const label = facets[key].find((o) => o.value === value)?.label ?? value;
      chips.push({
        key: `${key}:${value}`,
        label: `${prefix}${label}`,
        href: catalogHref(path, toggleListValue(params, key, value)),
      });
    }
  }
  if (params.price)
    chips.push({
      key: "price",
      label: priceLabel(params.price),
      href: catalogHref(path, withParams(params, { price: null })),
    });
  if (params.discount)
    chips.push({
      key: "discount",
      label: `${params.discount}% off or more`,
      href: catalogHref(path, withParams(params, { discount: null })),
    });
  if (params.inStock)
    chips.push({
      key: "stock",
      label: "In stock",
      href: catalogHref(path, withParams(params, { inStock: false })),
    });
  return chips;
}

export function ActiveChips({
  params,
  facets,
  path,
}: {
  params: CatalogParams;
  facets: CatalogFacets;
  path: string;
}) {
  if (!hasActiveFilters(params)) return null;
  const chips = buildChips(params, facets, path);
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className="inline-flex items-center gap-1.5 rounded-sm border border-border py-1 pr-2 pl-3 text-sm transition-colors hover:border-foreground"
        >
          {chip.label}
          <X className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="sr-only">, remove</span>
        </Link>
      ))}
      <Link
        href={catalogHref(path, clearFilters(params))}
        className="ml-1 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Clear all
      </Link>
    </div>
  );
}
