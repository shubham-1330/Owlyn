import { unstable_cache } from "next/cache";

/**
 * Tag names used with `revalidateTag` when admin publishes changes (Phase 7).
 * Queries wrapped with `cached` must return JSON-safe data: no Date objects,
 * no Decimals, because the data cache serialises results.
 *
 * Global tags cover a whole family; entity tags (`product:<slug>`) let a
 * single publish invalidate one page without dropping every listing.
 */
export const CACHE_TAGS = {
  home: "home",
  products: "products",
  reviews: "reviews",
  banners: "banners",
  menus: "menus",
  settings: "settings",
  pages: "pages",
  collections: "collections",
  categories: "categories",
  shipping: "shipping",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS] | `${string}:${string}`;

export const productTag = (slug: string): CacheTag => `product:${slug}`;
export const categoryTag = (slug: string): CacheTag => `category:${slug}`;
export const collectionTag = (slug: string): CacheTag => `collection:${slug}`;

export const DEFAULT_REVALIDATE_SECONDS = 300;

export function cached<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  keyParts: string[],
  tags: CacheTag[],
  revalidate: number = DEFAULT_REVALIDATE_SECONDS,
): (...args: Args) => Promise<Result> {
  return unstable_cache(fn, keyParts, { tags, revalidate });
}
