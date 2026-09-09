"use client";

import { useMemo, useState } from "react";

import { RatingStars } from "@/components/storefront/rating-stars";
import { Badge } from "@/components/ui/badge";
import type { ProductReview } from "@/lib/queries/product";

type Sort = "newest" | "highest" | "lowest" | "helpful";

const LABELS: Record<Sort, string> = {
  newest: "Newest",
  highest: "Highest rated",
  lowest: "Lowest rated",
  helpful: "Most helpful",
};

const DATE = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Client-side sort over the reviews already on the page (at most 50). */
export function ReviewList({ reviews }: { reviews: ProductReview[] }) {
  const [sort, setSort] = useState<Sort>("newest");
  const sorted = useMemo(() => {
    const list = [...reviews];
    switch (sort) {
      case "highest":
        return list.sort((a, b) => b.rating - a.rating || b.helpfulCount - a.helpfulCount);
      case "lowest":
        return list.sort((a, b) => a.rating - b.rating || b.helpfulCount - a.helpfulCount);
      case "helpful":
        return list.sort((a, b) => b.helpfulCount - a.helpfulCount);
      default:
        return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }, [reviews, sort]);

  return (
    <div className="flex flex-col gap-6">
      <label className="flex items-center gap-2 self-end text-sm">
        <span className="text-muted-foreground">Sort reviews</span>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as Sort)}
          className="h-9 rounded-sm border border-input bg-transparent px-2 text-sm text-foreground outline-none hover:border-fog focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring"
        >
          {(Object.keys(LABELS) as Sort[]).map((key) => (
            <option key={key} value={key} className="bg-slate text-foreground">
              {LABELS[key]}
            </option>
          ))}
        </select>
      </label>

      <ol className="flex flex-col gap-8">
        {sorted.map((review) => (
          <li key={review.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <RatingStars value={review.rating} />
              <span className="text-sm font-medium">{review.author}</span>
              {review.isVerifiedPurchase ? (
                <Badge variant="outline">Verified purchase</Badge>
              ) : null}
              <time dateTime={review.createdAt} className="text-xs text-muted-foreground">
                {DATE.format(new Date(review.createdAt))}
              </time>
            </div>
            <p className="font-medium">{review.title}</p>
            <p className="measure text-sm text-foreground/90">{review.body}</p>
            {review.helpfulCount > 0 ? (
              <p className="text-xs text-muted-foreground num">
                {review.helpfulCount} {review.helpfulCount === 1 ? "person" : "people"} found this
                helpful
              </p>
            ) : null}
            {review.reply ? (
              <div className="mt-1 flex flex-col gap-1 border-l-2 border-talon pl-4">
                <p className="text-xs text-muted-foreground">Owlyn replied</p>
                <p className="measure text-sm">{review.reply}</p>
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
