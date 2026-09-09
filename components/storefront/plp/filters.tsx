import { Check } from "lucide-react";
import Link from "next/link";

import { PriceRangeForm } from "@/components/storefront/plp/price-range-form";
import type { CatalogFacets, FacetOption } from "@/lib/catalog/query";
import {
  catalogHref,
  DISCOUNT_STEPS,
  isIndexable,
  toggleListValue,
  withParams,
  type CatalogParams,
  type ListDimension,
} from "@/lib/search-params";
import { cn } from "@/lib/utils";

/**
 * Every control is a real link, so filters work without JavaScript, are
 * keyboard reachable, and every state has a URL. Links into multi-facet
 * combinations carry rel="nofollow" to keep crawlers on indexable pages.
 */

const option =
  "group flex w-full items-center gap-3 py-1.5 text-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function CheckBox({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-xs border transition-colors",
        active ? "border-talon bg-talon text-ink" : "border-fog group-hover:border-foreground",
      )}
    >
      {active ? <Check className="size-3" strokeWidth={3} /> : null}
    </span>
  );
}

function OptionLink({
  href,
  active,
  nofollow,
  children,
  count,
}: {
  href: string;
  active: boolean;
  nofollow: boolean;
  children: React.ReactNode;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      rel={nofollow ? "nofollow" : undefined}
      className={cn(option, active && "text-foreground")}
    >
      <CheckBox active={active} />
      <span className="flex-1">{children}</span>
      <span className="text-xs text-muted-foreground num">{count}</span>
      {active ? <span className="sr-only">, selected</span> : null}
    </Link>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 py-5" aria-label={title}>
      <h3 className="font-sans text-sm font-medium tracking-normal [font-stretch:normal]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ListGroup({
  title,
  dimension,
  options,
  params,
  path,
  swatch = false,
}: {
  title: string;
  dimension: ListDimension;
  options: FacetOption[];
  params: CatalogParams;
  path: string;
  swatch?: boolean;
}) {
  if (options.length === 0) return null;
  const selected: readonly string[] = params[dimension];
  return (
    <Group title={title}>
      <ul className="flex flex-col">
        {options.map((o) => {
          const active = selected.includes(o.value);
          const next = toggleListValue(params, dimension, o.value);
          const nofollow = !isIndexable(next);
          return (
            <li key={o.value}>
              <OptionLink
                href={catalogHref(path, next)}
                active={active}
                nofollow={nofollow}
                count={o.count}
              >
                <span className="flex items-center gap-2">
                  {swatch ? (
                    <span
                      aria-hidden
                      className="size-4 shrink-0 border border-fog-2"
                      style={{ backgroundColor: o.hex ?? "#8b9199" }}
                    />
                  ) : null}
                  {o.label}
                </span>
              </OptionLink>
            </li>
          );
        })}
      </ul>
    </Group>
  );
}

export function Filters({
  params,
  facets,
  path,
  genderLocked,
  categoryLocked,
}: {
  params: CatalogParams;
  facets: CatalogFacets;
  path: string;
  genderLocked: boolean;
  categoryLocked: boolean;
}) {
  const stockHref = catalogHref(path, withParams(params, { inStock: !params.inStock }));

  return (
    <div className="flex flex-col divide-y divide-border">
      {!categoryLocked && facets.category.length > 1 ? (
        <ListGroup
          title="Category"
          dimension="category"
          options={facets.category}
          params={params}
          path={path}
        />
      ) : null}

      <ListGroup title="Size" dimension="size" options={facets.size} params={params} path={path} />
      <ListGroup
        title="Colour"
        dimension="color"
        options={facets.color}
        params={params}
        path={path}
        swatch
      />

      <Group title="Price">
        <PriceRangeForm path={path} params={params} bounds={facets.price} />
      </Group>

      {!genderLocked ? (
        <ListGroup
          title="Gender"
          dimension="gender"
          options={facets.gender}
          params={params}
          path={path}
        />
      ) : null}

      <ListGroup
        title="Activity"
        dimension="activity"
        options={facets.activity}
        params={params}
        path={path}
      />
      <ListGroup
        title="Brand line"
        dimension="brand"
        options={facets.brand}
        params={params}
        path={path}
      />

      {facets.discount.length > 0 ? (
        <Group title="Discount">
          <ul className="flex flex-col">
            {DISCOUNT_STEPS.map((step) => {
              const facet = facets.discount.find((d) => Number(d.value) === step);
              if (!facet) return null;
              const active = params.discount === step;
              return (
                <li key={step}>
                  <OptionLink
                    href={catalogHref(path, withParams(params, { discount: active ? null : step }))}
                    active={active}
                    nofollow
                    count={facet.count}
                  >
                    {step}% off or more
                  </OptionLink>
                </li>
              );
            })}
          </ul>
        </Group>
      ) : null}

      <Group title="Availability">
        <OptionLink
          href={stockHref}
          active={params.inStock}
          nofollow={false}
          count={facets.inStock}
        >
          In stock only
        </OptionLink>
      </Group>
    </div>
  );
}
