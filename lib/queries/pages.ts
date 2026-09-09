import { CACHE_TAGS, cached } from "@/lib/cache";
import { db } from "@/lib/db";

export type CmsPage = {
  slug: string;
  title: string;
  body: string;
  excerpt: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  updatedAt: string;
};

export const getPublishedPage = cached(
  async (slug: string): Promise<CmsPage | null> => {
    const page = await db.page.findFirst({
      where: { slug, isPublished: true },
      select: {
        slug: true,
        title: true,
        body: true,
        excerpt: true,
        metaTitle: true,
        metaDescription: true,
        updatedAt: true,
      },
    });
    return page ? { ...page, updatedAt: page.updatedAt.toISOString() } : null;
  },
  ["page"],
  [CACHE_TAGS.pages],
);

export const getPublishedPageSlugs = cached(
  async (): Promise<string[]> => {
    const rows = await db.page.findMany({ where: { isPublished: true }, select: { slug: true } });
    return rows.map((r) => r.slug);
  },
  ["page:slugs"],
  [CACHE_TAGS.pages],
);
