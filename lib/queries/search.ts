import { db } from "@/lib/db";
import { productCardSelect, toProductCard, type ProductCardData } from "@/lib/queries/products";

export const SEARCH_QUERY_MAX_LENGTH = 100;

export function normaliseSearchQuery(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/g, " ").trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
}

/**
 * Full-text match on the weighted search vector, widened by trigram similarity
 * and a plain substring match so typos and partial words still find products.
 * Ranked by text relevance, then name similarity, then sales.
 */
export async function searchProducts(query: string, limit = 48): Promise<ProductCardData[]> {
  const q = normaliseSearchQuery(query);
  if (!q) return [];

  const hits = await db.$queryRaw<Array<{ id: string }>>`
    SELECT p.id
    FROM "Product" p
    WHERE p.status = 'ACTIVE'
      AND p."deletedAt" IS NULL
      AND (
        p."searchVector" @@ websearch_to_tsquery('english', ${q})
        OR p.name % ${q}
        OR p.name ILIKE ${"%" + q + "%"}
      )
    ORDER BY
      ts_rank(p."searchVector", websearch_to_tsquery('english', ${q})) DESC,
      similarity(p.name, ${q}) DESC,
      p."salesCount" DESC
    LIMIT ${limit}
  `;
  if (hits.length === 0) return [];

  const ids = hits.map((h) => h.id);
  const rows = await db.product.findMany({ where: { id: { in: ids } }, select: productCardSelect });
  const byId = new Map(rows.map((row) => [row.id, toProductCard(row)]));
  return ids.map((id) => byId.get(id)).filter((card): card is ProductCardData => Boolean(card));
}
