/**
 * Prints EXPLAIN ANALYZE for the catalog listing statement under the heaviest
 * filter combination: category subtree scope, every filter dimension active,
 * price sort. Run with: pnpm exec tsx scripts/explain-catalog.ts
 */
import { PrismaClient } from "@prisma/client";

import { buildCatalogSql, explainCatalogQuery } from "../lib/catalog/query";
import { parseCatalogParams } from "../lib/search-params";

const db = new PrismaClient();

async function main() {
  const men = await db.category.findUniqueOrThrow({ where: { slug: "men" }, select: { id: true } });
  const subtree = await db.category.findMany({
    where: { OR: [{ id: men.id }, { parentId: men.id }, { parent: { parentId: men.id } }] },
    select: { id: true },
  });
  const scope = { kind: "categories" as const, categoryIds: subtree.map((c) => c.id) };
  const params = parseCatalogParams({
    category: "sneakers,running-shoes,t-shirts",
    size: "uk-8,uk-9,m,l",
    color: "ink,bone,fog",
    price: "1000-9000",
    gender: "men",
    activity: "running,everyday",
    brand: "hush,boom,seam",
    discount: "10",
    stock: "in",
    sort: "price_asc",
    page: "1",
  });

  const sql = buildCatalogSql(scope, params);
  const started = performance.now();
  const rows = await db.$queryRaw<Array<{ total: number; items: unknown[] }>>(sql);
  const ms = performance.now() - started;
  console.log(
    `Result: total=${rows[0]?.total} items=${rows[0]?.items.length} in ${ms.toFixed(1)} ms (single round trip)\n`,
  );

  const plan = await explainCatalogQuery(scope, params);
  console.log(plan.join("\n"));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
