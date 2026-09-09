import { CACHE_TAGS, cached } from "@/lib/cache";
import { db } from "@/lib/db";

export type CollectionNode = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  heroImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  startsAt: string | null;
  endsAt: string | null;
  position: number;
};

export const getCollectionList = cached(
  async (): Promise<CollectionNode[]> => {
    const rows = await db.collection.findMany({
      where: { isActive: true },
      orderBy: { position: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        heroImage: true,
        metaTitle: true,
        metaDescription: true,
        startsAt: true,
        endsAt: true,
        position: true,
      },
    });
    return rows.map((row) => ({
      ...row,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
    }));
  },
  ["collections:all"],
  [CACHE_TAGS.collections],
);

/** A collection is live when its schedule window includes now (or has no window). */
export function isCollectionLive(collection: CollectionNode, now = new Date()): boolean {
  if (collection.startsAt && new Date(collection.startsAt) > now) return false;
  if (collection.endsAt && new Date(collection.endsAt) < now) return false;
  return true;
}
