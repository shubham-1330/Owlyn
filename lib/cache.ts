import { unstable_cache } from "next/cache";

/**
 * Tag names used with `revalidateTag` when admin publishes changes (Phase 7).
 * Queries wrapped with `cached` must return JSON-safe data: no Date objects,
 * no Decimals, because the data cache serialises results.
 */
export const CACHE_TAGS = {
  home: "home",
  products: "products",
  banners: "banners",
  menus: "menus",
  settings: "settings",
  pages: "pages",
  collections: "collections",
  categories: "categories",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const DEFAULT_REVALIDATE_SECONDS = 300;

export function cached<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
  tags: CacheTag[],
  revalidate: number = DEFAULT_REVALIDATE_SECONDS,
): (...args: Args) => Promise<Result> {
  return unstable_cache(fn, keyParts, { tags, revalidate });
}
