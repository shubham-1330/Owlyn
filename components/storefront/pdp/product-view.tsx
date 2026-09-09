"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { DeliveryEstimator } from "@/components/storefront/pdp/delivery-estimator";
import { Gallery } from "@/components/storefront/pdp/gallery";
import { NotifyForm } from "@/components/storefront/pdp/notify-form";
import { SizeGuideDialog } from "@/components/storefront/pdp/size-guide-dialog";
import { StickyBar } from "@/components/storefront/pdp/sticky-bar";
import { Price } from "@/components/storefront/price";
import { RatingStars } from "@/components/storefront/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BADGE_LABEL, BADGE_VARIANT } from "@/lib/catalog/badges";
import type { ProductDetail, ProductVariantData } from "@/lib/queries/product";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";

export type ProductViewData = Pick<
  ProductDetail,
  | "id"
  | "slug"
  | "name"
  | "brandLine"
  | "shortDescription"
  | "basePrice"
  | "compareAtPrice"
  | "badges"
  | "reviewCount"
  | "ratingSum"
  | "variants"
  | "media"
  | "sizeChart"
>;

type ColorGroup = {
  name: string;
  slug: string;
  hex: string;
  variants: ProductVariantData[];
  inStock: boolean;
};

function groupColors(variants: ProductVariantData[]): ColorGroup[] {
  const groups: ColorGroup[] = [];
  for (const variant of variants) {
    let group = groups.find((g) => g.name === variant.colorName);
    if (!group) {
      group = {
        name: variant.colorName,
        slug: slugify(variant.colorName),
        hex: variant.colorHex,
        variants: [],
        inStock: false,
      };
      groups.push(group);
    }
    group.variants.push(variant);
    if (variant.stock > 0) group.inStock = true;
  }
  return groups;
}

/**
 * Colour and size selection live here so the gallery, the purchase panel and
 * the mobile sticky bar agree. The chosen colour is mirrored into `?color=`
 * with replaceState, so the URL is shareable without a server round trip.
 */
export function ProductView({
  product,
  initialColor,
  defaultEmail,
}: {
  product: ProductViewData;
  initialColor: string | null;
  defaultEmail?: string | null;
}) {
  const colors = useMemo(() => groupColors(product.variants), [product.variants]);
  const initial =
    colors.find((c) => c.slug === initialColor) ??
    colors.find((c) => c.inStock) ??
    colors[0] ??
    null;
  const [colorSlug, setColorSlug] = useState<string | null>(initial?.slug ?? null);
  const [sizeId, setSizeId] = useState<string | null>(null);
  const buyButton = useRef<HTMLDivElement>(null);
  const [showSticky, setShowSticky] = useState(false);

  const color = colors.find((c) => c.slug === colorSlug) ?? initial;
  const selectedVariant = color?.variants.find((v) => v.id === sizeId) ?? null;
  const media = useMemo(() => {
    if (!color) return product.media;
    const ids = new Set(color.variants.map((v) => v.id));
    const own = product.media.filter((m) => m.variantId && ids.has(m.variantId));
    const shared = product.media.filter((m) => !m.variantId);
    const list = own.length ? [...own, ...shared] : shared;
    return list.length ? list : product.media;
  }, [color, product.media]);

  useEffect(() => {
    if (!colorSlug) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("color") === colorSlug) return;
    url.searchParams.set("color", colorSlug);
    window.history.replaceState(window.history.state, "", url.toString());
  }, [colorSlug]);

  useEffect(() => {
    const node = buyButton.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowSticky(!(entry?.isIntersecting ?? true)),
      {
        rootMargin: "0px 0px -56px 0px",
      },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const price =
    selectedVariant?.price ??
    (color ? Math.min(...color.variants.map((v) => v.price)) : product.basePrice);
  const compareAt = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const average = product.reviewCount > 0 ? product.ratingSum / product.reviewCount : 0;
  const singleSize = color?.variants.length === 1 && color.variants[0]?.size === "One size";

  useEffect(() => {
    if (singleSize && color?.variants[0]) setSizeId(color.variants[0].id);
  }, [singleSize, color]);

  const canAdd = Boolean(selectedVariant && selectedVariant.stock > 0);

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        <Gallery media={media} productName={product.name} resetKey={color?.slug ?? "all"} />

        <div className="flex flex-col gap-7 lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{product.brandLine}</p>
            <h1 className="text-2xl md:text-3xl">{product.name}</h1>
            <Price price={price} compareAtPrice={compareAt} size="lg" />
            <div className="flex flex-wrap items-center gap-3">
              {product.badges.map((badge) => (
                <Badge key={badge} variant={BADGE_VARIANT[badge]}>
                  {BADGE_LABEL[badge]}
                </Badge>
              ))}
              {product.reviewCount > 0 ? (
                <Link
                  href="#reviews"
                  className="inline-flex items-center gap-2 text-sm hover:text-primary"
                >
                  <RatingStars value={average} />
                  <span className="num">
                    {average.toFixed(1)} · {product.reviewCount}{" "}
                    {product.reviewCount === 1 ? "review" : "reviews"}
                  </span>
                </Link>
              ) : null}
            </div>
            <p className="measure text-foreground/90">{product.shortDescription}</p>
          </div>

          {colors.length > 0 && color ? (
            <fieldset className="flex flex-col gap-3">
              <legend className="text-sm">
                Colour: <span className="font-medium">{color.name}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => {
                      setColorSlug(c.slug);
                      setSizeId(null);
                    }}
                    aria-pressed={c.slug === color.slug}
                    aria-label={`${c.name}${c.inStock ? "" : ", sold out"}`}
                    title={c.name}
                    className={cn(
                      "relative size-9 border-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      c.slug === color.slug
                        ? "border-foreground"
                        : "border-transparent hover:border-fog",
                    )}
                  >
                    <span
                      className="absolute inset-0.5 border border-ink/30"
                      style={{ backgroundColor: c.hex }}
                      aria-hidden
                    />
                    {!c.inStock ? (
                      <span
                        className="absolute inset-0 m-auto h-px w-full rotate-45 bg-foreground/70"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          {color && !singleSize ? (
            <fieldset className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <legend className="text-sm">
                  Size
                  {selectedVariant ? (
                    <>
                      : <span className="font-medium">{selectedVariant.size}</span>
                    </>
                  ) : null}
                </legend>
                {product.sizeChart ? <SizeGuideDialog chart={product.sizeChart} /> : null}
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {color.variants.map((v) => {
                  const out = v.stock <= 0;
                  const selected = v.id === sizeId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSizeId(v.id)}
                      aria-pressed={selected}
                      aria-label={`${v.size}${out ? ", sold out" : ""}`}
                      className={cn(
                        "h-11 rounded-sm border text-sm num transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        selected
                          ? "border-foreground bg-foreground text-ink"
                          : "border-border hover:border-foreground",
                        out && !selected && "text-muted-foreground line-through",
                        out && selected && "bg-muted text-muted-foreground line-through",
                      )}
                    >
                      {v.size}
                    </button>
                  );
                })}
              </div>
              {selectedVariant &&
              selectedVariant.stock > 0 &&
              selectedVariant.stock <= selectedVariant.lowStockThreshold ? (
                <p className="text-sm text-alert-2 num">
                  Only {selectedVariant.stock} left in this size.
                </p>
              ) : null}
              {selectedVariant && selectedVariant.stock <= 0 ? (
                <NotifyForm
                  variantId={selectedVariant.id}
                  sizeLabel={`${color.name}, ${selectedVariant.size}`}
                  defaultEmail={defaultEmail}
                />
              ) : null}
            </fieldset>
          ) : null}

          {singleSize && selectedVariant && selectedVariant.stock <= 0 ? (
            <NotifyForm
              variantId={selectedVariant.id}
              sizeLabel={color?.name ?? "This colour"}
              defaultEmail={defaultEmail}
            />
          ) : null}

          <div ref={buyButton} className="flex flex-col gap-2">
            <Button
              size="lg"
              disabled
              aria-disabled
              className="w-full"
              title="The bag opens in the next release"
            >
              {canAdd ? "Add to bag" : selectedVariant ? "Sold out" : "Select a size"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Bag and checkout open in the next release.
            </p>
          </div>

          <DeliveryEstimator unitPrice={price} />
        </div>
      </div>

      <StickyBar
        visible={showSticky}
        name={product.name}
        price={price}
        compareAtPrice={compareAt}
        detail={[color?.name, selectedVariant?.size].filter(Boolean).join(" · ")}
        canAdd={canAdd}
      />
    </>
  );
}
