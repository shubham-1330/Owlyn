import type { Gender, MediaKind, ProductBadge } from "@prisma/client";
import { z } from "zod";

import { CACHE_TAGS, cached, productTag } from "@/lib/cache";
import { db } from "@/lib/db";
import {
  activeProductWhere,
  productCardSelect,
  toProductCard,
  type ProductCardData,
} from "@/lib/queries/products";
import { buildCategoryIndex, categoryChain, getCategoryList } from "@/lib/queries/categories";

export type ProductVariantData = {
  id: string;
  sku: string;
  size: string;
  colorName: string;
  colorHex: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  lowStockThreshold: number;
  position: number;
};

export type ProductMedia = {
  id: string;
  url: string;
  alt: string;
  blurData: string | null;
  kind: MediaKind;
  posterUrl: string | null;
  variantId: string | null;
  position: number;
};

export type ProductReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  images: string[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  author: string;
  reply: string | null;
  repliedAt: string | null;
};

export type SizeChartData = { name: string; columns: string[]; rows: string[][]; note?: string };

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  brandLine: string;
  gender: Gender;
  description: string;
  shortDescription: string;
  materials: string | null;
  careInstructions: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  taxRate: number;
  badges: ProductBadge[];
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  reviewCount: number;
  ratingSum: number;
  categoryChain: Array<{ slug: string; name: string }>;
  sizeChart: SizeChartData | null;
  attributes: Array<{ attribute: string; slug: string; value: string; valueSlug: string }>;
  variants: ProductVariantData[];
  media: ProductMedia[];
  related: ProductCardData[];
  similar: ProductCardData[];
  reviews: ProductReview[];
  histogram: Record<1 | 2 | 3 | 4 | 5, number>;
};

const sizeChartSchema = z.object({
  columns: z.array(z.string()).min(1),
  rows: z.array(z.array(z.string())).min(1),
  note: z.string().optional(),
});

function authorLabel(name: string | null): string {
  if (!name) return "Owlyn customer";
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.length ? ` ${rest[rest.length - 1]![0]!.toUpperCase()}.` : "";
  return `${first}${last}`;
}

async function loadProductDetail(slug: string): Promise<ProductDetail | null> {
  const product = await db.product.findFirst({
    where: { slug, ...activeProductWhere },
    select: {
      id: true,
      slug: true,
      name: true,
      brandLine: true,
      gender: true,
      description: true,
      shortDescription: true,
      materials: true,
      careInstructions: true,
      basePrice: true,
      compareAtPrice: true,
      taxRate: true,
      badges: true,
      metaTitle: true,
      metaDescription: true,
      publishedAt: true,
      reviewCount: true,
      ratingSum: true,
      primaryCategoryId: true,
      primaryCategory: { select: { sizeChart: { select: { name: true, rows: true } } } },
      variants: {
        where: { isActive: true },
        orderBy: { position: "asc" },
        select: {
          id: true,
          sku: true,
          size: true,
          colorName: true,
          colorHex: true,
          price: true,
          compareAtPrice: true,
          stock: true,
          lowStockThreshold: true,
          position: true,
        },
      },
      images: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          url: true,
          alt: true,
          blurData: true,
          kind: true,
          posterUrl: true,
          variantId: true,
          position: true,
        },
      },
      attributeValues: {
        select: { value: true, slug: true, attribute: { select: { name: true, slug: true } } },
      },
      relatedFrom: {
        orderBy: { position: "asc" },
        where: { relatedProduct: activeProductWhere },
        select: { relatedProduct: { select: productCardSelect } },
      },
    },
  });
  if (!product) return null;

  const [categories, similarRows, reviewRows, histogramRows] = await Promise.all([
    getCategoryList(),
    db.product.findMany({
      where: {
        ...activeProductWhere,
        id: { not: product.id },
        ...(product.primaryCategoryId
          ? { categories: { some: { id: product.primaryCategoryId } } }
          : { brandLine: product.brandLine }),
      },
      orderBy: [{ salesCount: "desc" }, { publishedAt: "desc" }],
      take: 8,
      select: productCardSelect,
    }),
    db.review.findMany({
      where: { productId: product.id, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        images: true,
        isVerifiedPurchase: true,
        helpfulCount: true,
        createdAt: true,
        reply: true,
        repliedAt: true,
        user: { select: { name: true } },
      },
    }),
    db.review.groupBy({
      by: ["rating"],
      where: { productId: product.id, status: "APPROVED" },
      _count: { _all: true },
    }),
  ]);

  const index = buildCategoryIndex(categories);
  const primary = product.primaryCategoryId ? index.byId.get(product.primaryCategoryId) : undefined;
  const chain = primary
    ? categoryChain(index, primary).map((c) => ({ slug: c.slug, name: c.name }))
    : [];

  const chartRows = product.primaryCategory?.sizeChart
    ? sizeChartSchema.safeParse(product.primaryCategory.sizeChart.rows)
    : null;
  const sizeChart: SizeChartData | null =
    chartRows?.success && product.primaryCategory?.sizeChart
      ? { name: product.primaryCategory.sizeChart.name, ...chartRows.data }
      : null;

  const histogram: ProductDetail["histogram"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of histogramRows) {
    const rating = row.rating as 1 | 2 | 3 | 4 | 5;
    if (rating >= 1 && rating <= 5) histogram[rating] = row._count._all;
  }

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brandLine: product.brandLine,
    gender: product.gender,
    description: product.description,
    shortDescription: product.shortDescription,
    materials: product.materials,
    careInstructions: product.careInstructions,
    basePrice: product.basePrice,
    compareAtPrice: product.compareAtPrice,
    taxRate: product.taxRate,
    badges: product.badges,
    metaTitle: product.metaTitle,
    metaDescription: product.metaDescription,
    publishedAt: product.publishedAt?.toISOString() ?? null,
    reviewCount: product.reviewCount,
    ratingSum: product.ratingSum,
    categoryChain: chain,
    sizeChart,
    attributes: product.attributeValues.map((av) => ({
      attribute: av.attribute.name,
      slug: av.attribute.slug,
      value: av.value,
      valueSlug: av.slug,
    })),
    variants: product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      colorName: v.colorName,
      colorHex: v.colorHex,
      price: v.price ?? product.basePrice,
      compareAtPrice: v.compareAtPrice ?? product.compareAtPrice,
      stock: v.stock,
      lowStockThreshold: v.lowStockThreshold,
      position: v.position,
    })),
    media: product.images,
    related: product.relatedFrom.map((r) => toProductCard(r.relatedProduct)),
    similar: similarRows.map(toProductCard),
    reviews: reviewRows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      images: r.images,
      isVerifiedPurchase: r.isVerifiedPurchase,
      helpfulCount: r.helpfulCount,
      createdAt: r.createdAt.toISOString(),
      author: authorLabel(r.user.name),
      reply: r.reply,
      repliedAt: r.repliedAt?.toISOString() ?? null,
    })),
    histogram,
  };
}

/** Cached per product with the global tags plus `product:<slug>` for targeted invalidation. */
export function getProductDetail(slug: string): Promise<ProductDetail | null> {
  return cached(
    loadProductDetail,
    ["product:detail:v2"],
    [CACHE_TAGS.products, CACHE_TAGS.reviews, CACHE_TAGS.categories, productTag(slug)],
  )(slug);
}

export const getProductSlugs = cached(
  async (): Promise<Array<{ slug: string; updatedAt: string }>> => {
    const rows = await db.product.findMany({
      where: activeProductWhere,
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((r) => ({ slug: r.slug, updatedAt: r.updatedAt.toISOString() }));
  },
  ["product:slugs"],
  [CACHE_TAGS.products],
);
