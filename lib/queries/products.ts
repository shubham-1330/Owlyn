import type { Prisma, ProductBadge } from "@prisma/client";

import { CACHE_TAGS, cached } from "@/lib/cache";
import { db } from "@/lib/db";

/** Everything a product card needs, and nothing that is not JSON-safe. */
export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  brandLine: true,
  basePrice: true,
  compareAtPrice: true,
  badges: true,
  images: {
    where: { kind: "IMAGE" },
    select: { url: true, alt: true, blurData: true },
    orderBy: { position: "asc" },
    take: 2,
  },
  variants: {
    where: { isActive: true },
    orderBy: { position: "asc" },
    select: { id: true, size: true, stock: true, colorName: true, price: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductCardRow = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  brandLine: string;
  price: number;
  compareAtPrice: number | null;
  badges: ProductBadge[];
  images: Array<{ url: string; alt: string; blurData?: string | null }>;
  inStock: boolean;
  colorCount: number;
  /** Purchasable options for quick add, in position order. */
  variants: Array<{ id: string; size: string; colorName: string; stock: number }>;
};

export function toProductCard(p: ProductCardRow): ProductCardData {
  const variantPrices = p.variants.map((v) => v.price ?? p.basePrice);
  const price = variantPrices.length ? Math.min(...variantPrices) : p.basePrice;
  const inStock = p.variants.some((v) => v.stock > 0);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brandLine: p.brandLine,
    price,
    compareAtPrice: p.compareAtPrice,
    badges: inStock
      ? p.badges.filter((b) => b !== "SOLD_OUT")
      : Array.from(new Set([...p.badges, "SOLD_OUT" as const])),
    images: p.images,
    inStock,
    colorCount: new Set(p.variants.map((v) => v.colorName)).size,
    variants: p.variants.map((v) => ({
      id: v.id,
      size: v.size,
      colorName: v.colorName,
      stock: v.stock,
    })),
  };
}

export const activeProductWhere = {
  status: "ACTIVE",
  deletedAt: null,
} satisfies Prisma.ProductWhereInput;

export const getFeaturedProducts = cached(
  async (limit: number): Promise<ProductCardData[]> => {
    const rows = await db.product.findMany({
      where: { ...activeProductWhere, isFeatured: true },
      orderBy: [{ salesCount: "desc" }, { publishedAt: "desc" }],
      take: limit,
      select: productCardSelect,
    });
    return rows.map(toProductCard);
  },
  ["products:featured:v2"],
  [CACHE_TAGS.products],
);

/** Newest products published within `days`; falls back to the newest overall when the window is thin. */
export const getNewProducts = cached(
  async (limit: number, days: number): Promise<ProductCardData[]> => {
    const since = new Date(Date.now() - days * 86_400_000);
    let rows = await db.product.findMany({
      where: { ...activeProductWhere, publishedAt: { gte: since } },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: productCardSelect,
    });
    if (rows.length < 4) {
      rows = await db.product.findMany({
        where: activeProductWhere,
        orderBy: { publishedAt: "desc" },
        take: limit,
        select: productCardSelect,
      });
    }
    return rows.map(toProductCard);
  },
  ["products:new:v2"],
  [CACHE_TAGS.products],
);

export type CollectionSummary = {
  slug: string;
  name: string;
  description: string | null;
  heroImage: string | null;
  products: ProductCardData[];
};

export const getCollectionWithProducts = cached(
  async (slug: string, limit: number): Promise<CollectionSummary | null> => {
    const collection = await db.collection.findFirst({
      where: { slug, isActive: true },
      select: {
        slug: true,
        name: true,
        description: true,
        heroImage: true,
        products: {
          orderBy: { position: "asc" },
          take: limit,
          where: { product: activeProductWhere },
          select: { product: { select: productCardSelect } },
        },
      },
    });
    if (!collection) return null;
    return {
      slug: collection.slug,
      name: collection.name,
      description: collection.description,
      heroImage: collection.heroImage,
      products: collection.products.map((cp) => toProductCard(cp.product)),
    };
  },
  ["collection:with-products:v2"],
  [CACHE_TAGS.collections, CACHE_TAGS.products],
);
