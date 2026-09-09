import { db } from "@/lib/db";
import {
  activeProductWhere,
  productCardSelect,
  toProductCard,
  type ProductCardData,
} from "@/lib/queries/products";

export const RECENTLY_VIEWED_CAP = 12;

type Viewer = { userId: string | null; token: string | null };

function ownerWhere(viewer: Viewer) {
  return viewer.userId ? { userId: viewer.userId } : { token: viewer.token ?? "" };
}

/** Records a view, deduplicating on the product and keeping the newest twelve. */
export async function recordView(viewer: Viewer, productId: string): Promise<void> {
  if (!viewer.userId && !viewer.token) return;
  const owner = ownerWhere(viewer);
  const existing = await db.recentlyViewed.findFirst({
    where: { ...owner, productId },
    select: { id: true },
  });
  if (existing) {
    await db.recentlyViewed.update({ where: { id: existing.id }, data: { viewedAt: new Date() } });
  } else {
    await db.recentlyViewed.create({ data: { ...owner, productId, viewedAt: new Date() } });
  }
  const overflow = await db.recentlyViewed.findMany({
    where: owner,
    orderBy: { viewedAt: "desc" },
    skip: RECENTLY_VIEWED_CAP,
    select: { id: true },
  });
  if (overflow.length)
    await db.recentlyViewed.deleteMany({ where: { id: { in: overflow.map((o) => o.id) } } });
}

export async function getRecentlyViewed(
  viewer: Viewer,
  exclude: string[] = [],
  limit = 8,
): Promise<ProductCardData[]> {
  if (!viewer.userId && !viewer.token) return [];
  const rows = await db.recentlyViewed.findMany({
    where: { ...ownerWhere(viewer), productId: { notIn: exclude }, product: activeProductWhere },
    orderBy: { viewedAt: "desc" },
    take: limit,
    select: { product: { select: productCardSelect } },
  });
  return rows.map((r) => toProductCard(r.product));
}
