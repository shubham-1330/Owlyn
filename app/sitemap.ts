import type { MetadataRoute } from "next";

import { getCategoryList } from "@/lib/queries/categories";
import { getCollectionList, isCollectionLive } from "@/lib/queries/collections";
import { getPublishedPageSlugs } from "@/lib/queries/pages";
import { getProductSlugs } from "@/lib/queries/product";
import { absoluteUrl } from "@/lib/site";

const VIRTUAL_LISTINGS = ["new", "bestsellers", "sale", "all"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, collections, pages, products] = await Promise.all([
    getCategoryList(),
    getCollectionList(),
    getPublishedPageSlugs(),
    getProductSlugs(),
  ]);

  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    ...VIRTUAL_LISTINGS.map((slug) => ({
      url: absoluteUrl(`/collections/${slug}`),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...categories.map((c) => ({
      url: absoluteUrl(`/collections/${c.slug}`),
      changeFrequency: "daily" as const,
      priority: c.parentId ? 0.7 : 0.8,
    })),
    ...collections
      .filter((c) => isCollectionLive(c))
      .map((c) => ({
        url: absoluteUrl(`/collections/${c.slug}`),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ...products.map((p) => ({
      url: absoluteUrl(`/products/${p.slug}`),
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...pages.map((slug) => ({
      url: absoluteUrl(`/pages/${slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];
}
