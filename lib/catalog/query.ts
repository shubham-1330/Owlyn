import { Prisma, type ProductBadge } from "@prisma/client";

import { CACHE_TAGS, cached } from "@/lib/cache";
import type { CatalogScope } from "@/lib/catalog/scope";
import { db } from "@/lib/db";
import type { ProductCardData } from "@/lib/queries/products";
import {
  PAGE_SIZE,
  type CatalogParams,
  type FilterDimension,
  type GenderOption,
} from "@/lib/search-params";

/**
 * One SQL statement per listing page. It returns a single row holding the
 * page of products (with their first two images as JSON), the total, and
 * every facet. Each facet is counted with all the *other* filters applied,
 * which is what makes "12" next to "UK 9" true after you tick "Ink".
 *
 * Aliases: `p` is Product inside the base CTE, `b` is a base row, `v` is a
 * variant inside EXISTS / LATERAL subqueries.
 */

export type FacetOption = { value: string; label: string; count: number; hex?: string | null };

export type CatalogFacets = {
  category: FacetOption[];
  size: FacetOption[];
  color: FacetOption[];
  gender: FacetOption[];
  activity: FacetOption[];
  brand: FacetOption[];
  discount: FacetOption[];
  inStock: number;
  price: { min: number; max: number } | null;
};

export type CatalogResult = {
  items: ProductCardData[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  facets: CatalogFacets;
};

const SIZE_SLUG = Prisma.sql`lower(regexp_replace(v.size, '[^a-zA-Z0-9]+', '-', 'g'))`;
const COLOR_SLUG = Prisma.sql`lower(regexp_replace(v."colorName", '[^a-zA-Z0-9]+', '-', 'g'))`;
const CATEGORY_TYPE = Prisma.sql`regexp_replace(c.slug, '^(men|women)-', '')`;

/** Natural size order: UK footwear sizes numerically, then XS to XXL, then paired sizes, then one size. */
const SIZE_ORDER = Prisma.sql`CASE
  WHEN v.size ~ '^UK ' THEN 100 + (regexp_replace(v.size, '[^0-9.]', '', 'g'))::numeric
  WHEN v.size = 'XS' THEN 200 WHEN v.size = 'S' THEN 201 WHEN v.size = 'M' THEN 202
  WHEN v.size = 'L' THEN 203 WHEN v.size = 'XL' THEN 204 WHEN v.size = 'XXL' THEN 205
  WHEN v.size = 'S/M' THEN 300 WHEN v.size = 'L/XL' THEN 301
  WHEN v.size = 'One size' THEN 400 ELSE 500 END`;

const GENDER_EXPANSION: Record<GenderOption, string[]> = {
  men: ["MEN", "UNISEX"],
  women: ["WOMEN", "UNISEX"],
  unisex: ["UNISEX"],
};

function list(values: readonly string[]): Prisma.Sql {
  return Prisma.join(values.map((v) => Prisma.sql`${v}`));
}

function and(parts: Prisma.Sql[]): Prisma.Sql {
  return parts.length ? Prisma.join(parts, " AND ") : Prisma.sql`TRUE`;
}

function scopeSql(scope: CatalogScope): Prisma.Sql {
  switch (scope.kind) {
    case "categories":
      if (scope.categoryIds.length === 0) return Prisma.sql`FALSE`;
      return Prisma.sql`EXISTS (SELECT 1 FROM "_ProductCategories" pc WHERE pc."B" = p.id AND pc."A" IN (${list(scope.categoryIds)}))`;
    case "collection":
      return Prisma.sql`EXISTS (SELECT 1 FROM "CollectionProduct" cp WHERE cp."productId" = p.id AND cp."collectionId" = ${scope.collectionId})`;
    case "virtual":
      switch (scope.key) {
        case "new":
          return Prisma.sql`p."publishedAt" >= now() - interval '30 days'`;
        case "sale":
          return Prisma.sql`p."compareAtPrice" IS NOT NULL AND p."compareAtPrice" > p."basePrice"`;
        default:
          return Prisma.sql`TRUE`;
      }
    case "search":
      return Prisma.sql`(p."searchVector" @@ websearch_to_tsquery('english', ${scope.q}) OR p.name % ${scope.q} OR p.name ILIKE ${"%" + scope.q + "%"})`;
  }
}

function rankSql(scope: CatalogScope): Prisma.Sql {
  if (scope.kind !== "search") return Prisma.sql`0::float`;
  return Prisma.sql`ts_rank(p."searchVector", websearch_to_tsquery('english', ${scope.q})) + similarity(p.name, ${scope.q})`;
}

/** Variant-level conditions on alias `v`, minus the excluded dimension. */
function variantConditions(params: CatalogParams, exclude: FilterDimension | null): Prisma.Sql[] {
  const parts: Prisma.Sql[] = [];
  if (exclude !== "size" && params.size.length)
    parts.push(Prisma.sql`${SIZE_SLUG} IN (${list(params.size)})`);
  if (exclude !== "color" && params.color.length)
    parts.push(Prisma.sql`${COLOR_SLUG} IN (${list(params.color)})`);
  if (exclude !== "inStock" && params.inStock) parts.push(Prisma.sql`v.stock > 0`);
  return parts;
}

/** Product-level WHERE for alias `b`, minus the excluded dimension. */
function whereFor(
  params: CatalogParams,
  scope: CatalogScope,
  exclude: FilterDimension | null,
): Prisma.Sql {
  const parts: Prisma.Sql[] = [];

  if (exclude !== "category" && params.category.length) {
    const inScope =
      scope.kind === "categories"
        ? Prisma.sql`AND c.id IN (${list(scope.categoryIds)})`
        : Prisma.empty;
    parts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "_ProductCategories" pc JOIN "Category" c ON c.id = pc."A" WHERE pc."B" = b.id AND ${CATEGORY_TYPE} IN (${list(params.category)}) ${inScope})`,
    );
  }

  const variant = variantConditions(params, exclude);
  if (variant.length) {
    parts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = b.id AND v."isActive" AND ${and(variant)})`,
    );
  }

  if (exclude !== "price" && params.price) {
    if (params.price.min !== undefined) parts.push(Prisma.sql`b.price >= ${params.price.min}`);
    if (params.price.max !== undefined) parts.push(Prisma.sql`b.price <= ${params.price.max}`);
  }

  if (exclude !== "gender" && params.gender.length) {
    const genders = Array.from(new Set(params.gender.flatMap((g) => GENDER_EXPANSION[g])));
    parts.push(Prisma.sql`b.gender IN (${list(genders)})`);
  }

  if (exclude !== "activity" && params.activity.length) {
    parts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "_ProductAttributeValues" pa JOIN "AttributeValue" av ON av.id = pa."A" JOIN "Attribute" a ON a.id = av."attributeId" WHERE pa."B" = b.id AND a.slug = 'activity' AND av.slug IN (${list(params.activity)}))`,
    );
  }

  if (exclude !== "brand" && params.brand.length) {
    parts.push(Prisma.sql`lower(b."brandLine") IN (${list(params.brand)})`);
  }

  if (exclude !== "discount" && params.discount) {
    parts.push(Prisma.sql`b.discount >= ${params.discount}`);
  }

  return and(parts);
}

function orderBy(params: CatalogParams, scope: CatalogScope): Prisma.Sql {
  switch (params.sort) {
    case "newest":
      return Prisma.sql`b."publishedAt" DESC NULLS LAST, b.id ASC`;
    case "price_asc":
      return Prisma.sql`b.price ASC, b.id ASC`;
    case "price_desc":
      return Prisma.sql`b.price DESC, b.id ASC`;
    case "bestselling":
      return Prisma.sql`b."salesCount" DESC, b.id ASC`;
    case "featured":
    default:
      if (scope.kind === "search") return Prisma.sql`b.rank DESC, b."salesCount" DESC, b.id ASC`;
      if (scope.kind === "virtual" && scope.key === "new")
        return Prisma.sql`b."publishedAt" DESC NULLS LAST, b.id ASC`;
      if (scope.kind === "virtual" && scope.key === "bestsellers")
        return Prisma.sql`b."salesCount" DESC, b.id ASC`;
      return Prisma.sql`b."isFeatured" DESC, b."salesCount" DESC, b.id ASC`;
  }
}

/** The full statement. Exported so the plan can be inspected with EXPLAIN. */
export function buildCatalogSql(
  scope: CatalogScope,
  params: CatalogParams,
  pageSize = PAGE_SIZE,
): Prisma.Sql {
  const offset = (params.page - 1) * pageSize;
  const order = orderBy(params, scope);
  const w = (exclude: FilterDimension | null) => whereFor(params, scope, exclude);
  const categoryScope =
    scope.kind === "categories"
      ? Prisma.sql`AND c.id IN (${list(scope.categoryIds)})`
      : Prisma.empty;

  return Prisma.sql`
WITH base AS (
  SELECT p.id, p.slug, p.name, p."brandLine", p.gender::text AS gender, p."basePrice", p."compareAtPrice",
         p.badges::text[] AS badges, p."isFeatured", p."salesCount", p."publishedAt",
         pv.price, pv.in_stock, pv.color_count,
         CASE WHEN p."compareAtPrice" IS NOT NULL AND p."compareAtPrice" > pv.price
              THEN round((p."compareAtPrice" - pv.price) * 100.0 / p."compareAtPrice")::int ELSE 0 END AS discount,
         ${rankSql(scope)} AS rank
  FROM "Product" p
  CROSS JOIN LATERAL (
    SELECT min(coalesce(v.price, p."basePrice")) AS price,
           coalesce(bool_or(v.stock > 0), false) AS in_stock,
           count(DISTINCT v."colorName")::int AS color_count
    FROM "ProductVariant" v
    WHERE v."productId" = p.id AND v."isActive"
  ) pv
  WHERE p.status = 'ACTIVE' AND p."deletedAt" IS NULL AND pv.price IS NOT NULL AND (${scopeSql(scope)})
),
matched AS (
  SELECT b.* FROM base b WHERE ${w(null)}
),
page AS (
  SELECT b.*, row_number() OVER (ORDER BY ${order}) AS ord
  FROM matched b
  ORDER BY ${order}
  LIMIT ${pageSize} OFFSET ${offset}
),
items AS (
  SELECT coalesce(json_agg(json_build_object(
    'id', pg.id, 'slug', pg.slug, 'name', pg.name, 'brandLine', pg."brandLine",
    'price', pg.price, 'compareAtPrice', pg."compareAtPrice", 'badges', pg.badges,
    'inStock', pg.in_stock, 'colorCount', pg.color_count,
    'images', coalesce((
      SELECT json_agg(json_build_object('url', i.url, 'alt', i.alt, 'blurData', i."blurData") ORDER BY i.position)
      FROM (SELECT pi.url, pi.alt, pi."blurData", pi.position FROM "ProductImage" pi WHERE pi."productId" = pg.id AND pi.kind = 'IMAGE' ORDER BY pi.position LIMIT 2) i
    ), '[]'::json)
  ) ORDER BY pg.ord), '[]'::json) AS items
  FROM page pg
),
f_category AS (
  SELECT ${CATEGORY_TYPE} AS value, c.name AS label, min(coalesce(par.position, 0) * 100 + c.position) AS pos, count(DISTINCT b.id)::int AS count
  FROM base b
  JOIN "_ProductCategories" pc ON pc."B" = b.id
  JOIN "Category" c ON c.id = pc."A"
  LEFT JOIN "Category" par ON par.id = c."parentId"
  WHERE c."deletedAt" IS NULL AND c."isActive"
    AND NOT EXISTS (SELECT 1 FROM "Category" ch WHERE ch."parentId" = c.id AND ch."deletedAt" IS NULL)
    ${categoryScope}
    AND ${w("category")}
  GROUP BY 1, 2
),
f_size AS (
  SELECT s.slug AS value, s.label, min(s.pos) AS pos, count(DISTINCT b.id)::int AS count
  FROM base b
  JOIN LATERAL (
    SELECT v.size AS label, ${SIZE_SLUG} AS slug, min(${SIZE_ORDER}) AS pos
    FROM "ProductVariant" v
    WHERE v."productId" = b.id AND v."isActive" AND ${and(variantConditions(params, "size"))}
    GROUP BY v.size
  ) s ON TRUE
  WHERE ${w("size")}
  GROUP BY s.slug, s.label
),
f_color AS (
  SELECT s.slug AS value, s.label, min(s.hex) AS hex, min(s.pos) AS pos, count(DISTINCT b.id)::int AS count
  FROM base b
  JOIN LATERAL (
    SELECT v."colorName" AS label, ${COLOR_SLUG} AS slug, min(v."colorHex") AS hex, min(v.position) AS pos
    FROM "ProductVariant" v
    WHERE v."productId" = b.id AND v."isActive" AND ${and(variantConditions(params, "color"))}
    GROUP BY v."colorName"
  ) s ON TRUE
  WHERE ${w("color")}
  GROUP BY s.slug, s.label
),
f_gender AS (
  SELECT 'men' AS value, 'Men' AS label, 1 AS pos, count(*)::int AS count FROM base b WHERE b.gender IN ('MEN','UNISEX') AND ${w("gender")}
  UNION ALL
  SELECT 'women', 'Women', 2, count(*)::int FROM base b WHERE b.gender IN ('WOMEN','UNISEX') AND ${w("gender")}
  UNION ALL
  SELECT 'unisex', 'Unisex', 3, count(*)::int FROM base b WHERE b.gender = 'UNISEX' AND ${w("gender")}
),
f_activity AS (
  SELECT av.slug AS value, av.value AS label, min(av.position) AS pos, count(DISTINCT b.id)::int AS count
  FROM base b
  JOIN "_ProductAttributeValues" pa ON pa."B" = b.id
  JOIN "AttributeValue" av ON av.id = pa."A"
  JOIN "Attribute" a ON a.id = av."attributeId" AND a.slug = 'activity'
  WHERE ${w("activity")}
  GROUP BY 1, 2
),
f_brand AS (
  SELECT lower(b."brandLine") AS value, b."brandLine" AS label, count(*)::int AS count
  FROM base b WHERE ${w("brand")}
  GROUP BY 1, 2
),
f_discount AS (
  SELECT t.threshold AS value, count(*)::int AS count
  FROM base b CROSS JOIN (VALUES (10), (20), (30), (40)) AS t(threshold)
  WHERE b.discount >= t.threshold AND ${w("discount")}
  GROUP BY 1
),
f_stock AS (
  SELECT count(*)::int AS count FROM base b WHERE b.in_stock AND ${w("inStock")}
),
f_price AS (
  SELECT min(b.price) AS min, max(b.price) AS max FROM base b WHERE ${w("price")}
)
SELECT
  (SELECT count(*)::int FROM matched) AS total,
  (SELECT items FROM items) AS items,
  (SELECT coalesce(json_agg(json_build_object('value', value, 'label', label, 'count', count) ORDER BY pos, label), '[]'::json) FROM f_category) AS category,
  (SELECT coalesce(json_agg(json_build_object('value', value, 'label', label, 'count', count) ORDER BY pos, label), '[]'::json) FROM f_size) AS size,
  (SELECT coalesce(json_agg(json_build_object('value', value, 'label', label, 'count', count, 'hex', hex) ORDER BY pos, label), '[]'::json) FROM f_color) AS color,
  (SELECT coalesce(json_agg(json_build_object('value', value, 'label', label, 'count', count) ORDER BY pos), '[]'::json) FROM f_gender) AS gender,
  (SELECT coalesce(json_agg(json_build_object('value', value, 'label', label, 'count', count) ORDER BY pos, label), '[]'::json) FROM f_activity) AS activity,
  (SELECT coalesce(json_agg(json_build_object('value', value, 'label', label, 'count', count) ORDER BY label), '[]'::json) FROM f_brand) AS brand,
  (SELECT coalesce(json_agg(json_build_object('value', value::text, 'label', value::text || '% off or more', 'count', count) ORDER BY value), '[]'::json) FROM f_discount) AS discount,
  (SELECT count FROM f_stock) AS "inStock",
  (SELECT json_build_object('min', min, 'max', max) FROM f_price) AS price
`;
}

type RawImage = { url: string; alt: string; blurData: string | null };
type RawItem = {
  id: string;
  slug: string;
  name: string;
  brandLine: string;
  price: number;
  compareAtPrice: number | null;
  badges: string[];
  inStock: boolean;
  colorCount: number;
  images: RawImage[];
};
type RawRow = {
  total: number;
  items: RawItem[];
  category: FacetOption[];
  size: FacetOption[];
  color: FacetOption[];
  gender: FacetOption[];
  activity: FacetOption[];
  brand: FacetOption[];
  discount: FacetOption[];
  inStock: number;
  price: { min: number | null; max: number | null };
};

const BADGES = new Set<string>(["NEW", "BESTSELLER", "SOLD_OUT", "LIMITED"]);

function toCard(item: RawItem): ProductCardData {
  const badges = item.badges.filter((b): b is ProductBadge => BADGES.has(b));
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    brandLine: item.brandLine,
    price: item.price,
    compareAtPrice: item.compareAtPrice,
    badges: item.inStock
      ? badges.filter((b) => b !== "SOLD_OUT")
      : Array.from(new Set([...badges, "SOLD_OUT" as const])),
    images: item.images,
    inStock: item.inStock,
    colorCount: item.colorCount,
  };
}

async function runCatalogQuery(scope: CatalogScope, params: CatalogParams): Promise<CatalogResult> {
  const rows = await db.$queryRaw<RawRow[]>(buildCatalogSql(scope, params, PAGE_SIZE));
  const row = rows[0];
  if (!row) throw new Error("Catalog query returned no row");
  const total = Number(row.total);
  return {
    items: row.items.map(toCard),
    total,
    page: params.page,
    pageSize: PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    facets: {
      category: row.category,
      size: row.size,
      color: row.color,
      gender: row.gender.filter((g) => g.count > 0),
      activity: row.activity,
      brand: row.brand,
      discount: row.discount,
      inStock: Number(row.inStock ?? 0),
      price:
        row.price && row.price.min !== null && row.price.max !== null
          ? { min: row.price.min, max: row.price.max }
          : null,
    },
  };
}

const cachedListing = cached(
  runCatalogQuery,
  ["catalog:listing"],
  [CACHE_TAGS.products, CACHE_TAGS.categories, CACHE_TAGS.collections],
);

/** Listing pages are cached by scope and params; search text is not cached. */
export function getCatalogListing(
  scope: CatalogScope,
  params: CatalogParams,
): Promise<CatalogResult> {
  return scope.kind === "search" ? runCatalogQuery(scope, params) : cachedListing(scope, params);
}

/** `EXPLAIN ANALYZE` for the statement, one line per plan row. */
export async function explainCatalogQuery(
  scope: CatalogScope,
  params: CatalogParams,
): Promise<string[]> {
  const rows = await db.$queryRaw<Array<{ "QUERY PLAN": string }>>(
    Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${buildCatalogSql(scope, params, PAGE_SIZE)}`,
  );
  return rows.map((r) => r["QUERY PLAN"]);
}
