import { z } from "zod";

import { rupeesToPaise } from "@/lib/money";

/**
 * The one parser for listing URLs. The PLP and the search page both read
 * their state from here and write it back with `serializeCatalogParams`, so
 * a filtered URL is canonical, shareable and stable across sessions.
 *
 * Multi-value params accept repeats (`size=uk-8&size=uk-9`) and comma lists
 * (`size=uk-8,uk-9`). Serialisation always writes sorted comma lists in a
 * fixed key order and drops defaults.
 */

export const SORT_OPTIONS = [
  "featured",
  "newest",
  "price_asc",
  "price_desc",
  "bestselling",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  newest: "Newest",
  price_asc: "Price, low to high",
  price_desc: "Price, high to low",
  bestselling: "Best selling",
};

export const GENDER_OPTIONS = ["men", "women", "unisex"] as const;
export type GenderOption = (typeof GENDER_OPTIONS)[number];

export const DISCOUNT_STEPS = [10, 20, 30, 40] as const;

export const PAGE_SIZE = 24;
export const MAX_PAGE = 500;

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type PriceRange = { min?: number; max?: number };

export type CatalogParams = {
  q: string;
  category: string[];
  size: string[];
  color: string[];
  price: PriceRange | null;
  gender: GenderOption[];
  activity: string[];
  brand: string[];
  discount: number | null;
  inStock: boolean;
  sort: SortOption;
  page: number;
};

export const FILTER_DIMENSIONS = [
  "category",
  "size",
  "color",
  "price",
  "gender",
  "activity",
  "brand",
  "discount",
  "inStock",
] as const;
export type FilterDimension = (typeof FILTER_DIMENSIONS)[number];

export type ListDimension = "category" | "size" | "color" | "gender" | "activity" | "brand";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_LIST = 20;

function first(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function toList(value: unknown): string[] {
  const parts = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  const out = new Set<string>();
  for (const part of parts) {
    if (typeof part !== "string") continue;
    for (const piece of part.split(",")) {
      const clean = piece.trim().toLowerCase();
      if (clean) out.add(clean);
    }
  }
  return Array.from(out).sort();
}

/** Keeps valid slugs, drops the rest silently: a bad value never breaks the page. */
const slugList = z.preprocess(
  (value) =>
    toList(value)
      .filter((v) => SLUG.test(v))
      .slice(0, MAX_LIST),
  z.array(z.string()),
);

const genderList = z.preprocess(
  (value) =>
    toList(value).filter((v): v is GenderOption =>
      (GENDER_OPTIONS as readonly string[]).includes(v),
    ),
  z.array(z.enum(GENDER_OPTIONS)),
);

const priceRange = z.preprocess(
  (value) => {
    const raw = first(value)?.trim();
    if (!raw) return null;
    const match = /^(\d{0,7})-(\d{0,7})$/.exec(raw);
    if (!match) return null;
    const min = match[1] ? rupeesToPaise(Number(match[1])) : undefined;
    const max = match[2] ? rupeesToPaise(Number(match[2])) : undefined;
    if (min === undefined && max === undefined) return null;
    if (min !== undefined && max !== undefined && min > max) return { min: max, max: min };
    return { min, max };
  },
  z.object({ min: z.number().int().optional(), max: z.number().int().optional() }).nullable(),
);

const discount = z.preprocess((value) => {
  const raw = first(value);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 && n <= 90 ? n : null;
}, z.number().int().nullable());

const inStock = z.preprocess((value) => first(value) === "in", z.boolean());

const sort = z.preprocess((value) => {
  const raw = first(value);
  return raw && (SORT_OPTIONS as readonly string[]).includes(raw) ? raw : "featured";
}, z.enum(SORT_OPTIONS));

const page = z.preprocess((value) => {
  const n = Number.parseInt(first(value) ?? "", 10);
  return Number.isInteger(n) && n >= 1 ? Math.min(n, MAX_PAGE) : 1;
}, z.number().int());

const query = z.preprocess(
  (value) => (first(value) ?? "").replace(/\s+/g, " ").trim().slice(0, 100),
  z.string(),
);

export const catalogParamsSchema = z.object({
  q: query,
  category: slugList,
  size: slugList,
  color: slugList,
  price: priceRange,
  gender: genderList,
  activity: slugList,
  brand: slugList,
  discount,
  inStock,
  sort,
  page,
});

export const DEFAULT_CATALOG_PARAMS: CatalogParams = {
  q: "",
  category: [],
  size: [],
  color: [],
  price: null,
  gender: [],
  activity: [],
  brand: [],
  discount: null,
  inStock: false,
  sort: "featured",
  page: 1,
};

/** Never throws. Every key falls back to its default when the input is unusable. */
export function parseCatalogParams(
  raw: RawSearchParams | URLSearchParams | undefined,
): CatalogParams {
  const input: RawSearchParams =
    raw instanceof URLSearchParams ? fromURLSearchParams(raw) : (raw ?? {});
  const price =
    input.price ??
    (input["price-min"] !== undefined || input["price-max"] !== undefined
      ? `${first(input["price-min"]) ?? ""}-${first(input["price-max"]) ?? ""}`.replace(
          /[^\d-]/g,
          "",
        )
      : undefined);
  const parsed = catalogParamsSchema.safeParse({
    q: input.q,
    category: input.category,
    size: input.size,
    color: input.color,
    price,
    gender: input.gender,
    activity: input.activity,
    brand: input.brand,
    discount: input.discount,
    inStock: input.stock,
    sort: input.sort,
    page: input.page,
  });
  return parsed.success ? parsed.data : DEFAULT_CATALOG_PARAMS;
}

function fromURLSearchParams(params: URLSearchParams): RawSearchParams {
  const out: RawSearchParams = {};
  for (const [key, value] of params.entries()) {
    const existing = out[key];
    if (existing === undefined) out[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else out[key] = [existing, value];
  }
  return out;
}

export function formatPriceRange(range: PriceRange): string {
  const min = range.min !== undefined ? String(Math.round(range.min / 100)) : "";
  const max = range.max !== undefined ? String(Math.round(range.max / 100)) : "";
  return `${min}-${max}`;
}

/** Query string without the leading `?`. Empty when everything is default. */
export function serializeCatalogParams(
  params: CatalogParams,
  options: { omitPage?: boolean; omitQuery?: boolean } = {},
): string {
  const out = new URLSearchParams();
  if (params.q && !options.omitQuery) out.set("q", params.q);
  for (const key of ["category", "size", "color", "gender", "activity", "brand"] as const) {
    const values = params[key];
    if (values.length) out.set(key, [...values].sort().join(","));
  }
  if (params.price && (params.price.min !== undefined || params.price.max !== undefined)) {
    out.set("price", formatPriceRange(params.price));
  }
  if (params.discount) out.set("discount", String(params.discount));
  if (params.inStock) out.set("stock", "in");
  if (params.sort !== "featured") out.set("sort", params.sort);
  if (params.page > 1 && !options.omitPage) out.set("page", String(params.page));
  return out.toString();
}

/** Path plus serialised params. Page resets to 1 whenever a filter or sort changes. */
export function catalogHref(
  path: string,
  params: CatalogParams,
  options?: { keepPage?: boolean },
): string {
  const qs = serializeCatalogParams(params, { omitPage: !options?.keepPage });
  return qs ? `${path}?${qs}` : path;
}

export function toggleListValue(
  params: CatalogParams,
  key: ListDimension,
  value: string,
): CatalogParams {
  const current = params[key] as string[];
  const next = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value].sort();
  return { ...params, [key]: next, page: 1 };
}

export function withParams(params: CatalogParams, patch: Partial<CatalogParams>): CatalogParams {
  return { ...params, ...patch, page: patch.page ?? 1 };
}

export function clearFilters(params: CatalogParams): CatalogParams {
  return { ...DEFAULT_CATALOG_PARAMS, q: params.q, sort: params.sort };
}

export function isDimensionActive(params: CatalogParams, dimension: FilterDimension): boolean {
  switch (dimension) {
    case "price":
      return params.price !== null;
    case "discount":
      return params.discount !== null;
    case "inStock":
      return params.inStock;
    default:
      return params[dimension].length > 0;
  }
}

export function activeDimensions(params: CatalogParams): FilterDimension[] {
  return FILTER_DIMENSIONS.filter((d) => isDimensionActive(params, d));
}

export function hasActiveFilters(params: CatalogParams): boolean {
  return activeDimensions(params).length > 0;
}

/**
 * SEO rule: the bare listing and single-facet pages (one dimension, one value,
 * default sort) are indexable. Everything else is noindex,follow so crawlers
 * still reach products through the links.
 */
export function isIndexable(params: CatalogParams): boolean {
  if (params.q) return false;
  if (params.sort !== "featured") return false;
  const dims = activeDimensions(params);
  if (dims.length === 0) return true;
  if (dims.length > 1) return false;
  const dim = dims[0]!;
  if (dim === "price" || dim === "discount") return false;
  if (dim === "inStock") return true;
  return params[dim].length === 1;
}
