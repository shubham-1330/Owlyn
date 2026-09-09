"use client";

import { useEffect } from "react";

import { recordRecentlyViewedAction } from "@/app/(storefront)/products/[slug]/actions";

/** Fires once per product page visit. Nothing renders. */
export function RecordView({ productId }: { productId: string }) {
  useEffect(() => {
    void recordRecentlyViewedAction({ productId });
  }, [productId]);
  return null;
}
