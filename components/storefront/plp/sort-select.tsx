"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  catalogHref,
  SORT_LABELS,
  SORT_OPTIONS,
  withParams,
  type CatalogParams,
} from "@/lib/search-params";

export function SortSelect({ path, params }: { path: string; params: CatalogParams }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Sort</span>
      <select
        name="sort"
        value={params.sort}
        disabled={pending}
        onChange={(event) => {
          const sort = event.target.value as CatalogParams["sort"];
          startTransition(() => router.push(catalogHref(path, withParams(params, { sort }))));
        }}
        className="h-9 rounded-sm border border-input bg-transparent px-2 text-sm text-foreground outline-none hover:border-fog focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option} value={option} className="bg-slate text-foreground">
            {SORT_LABELS[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
