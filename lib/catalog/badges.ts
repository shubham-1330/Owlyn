import type { ProductBadge } from "@prisma/client";

export const BADGE_LABEL: Record<ProductBadge, string> = {
  NEW: "New",
  BESTSELLER: "Bestseller",
  SOLD_OUT: "Sold out",
  LIMITED: "Limited",
};

export const BADGE_VARIANT: Record<ProductBadge, "default" | "brass" | "dusk" | "muted"> = {
  NEW: "default",
  BESTSELLER: "brass",
  LIMITED: "dusk",
  SOLD_OUT: "muted",
};
