import { ReviewList } from "@/components/storefront/pdp/review-list";
import { RatingStars } from "@/components/storefront/rating-stars";
import type { ProductDetail } from "@/lib/queries/product";

export function ReviewsSection({ product }: { product: ProductDetail }) {
  const count = product.reviewCount;
  const average = count > 0 ? product.ratingSum / count : 0;
  const bars = [5, 4, 3, 2, 1] as const;

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="flex scroll-mt-24 flex-col gap-8"
    >
      <div className="flex flex-col gap-2">
        <h2 id="reviews-heading" className="text-xl md:text-2xl">
          Reviews
        </h2>
        {count === 0 ? (
          <p className="text-muted-foreground">
            No reviews yet. Reviews open to verified buyers after delivery.
          </p>
        ) : null}
      </div>

      {count > 0 ? (
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-16">
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline gap-3">
              <span className="display text-3xl num">{average.toFixed(1)}</span>
              <div className="flex flex-col gap-1">
                <RatingStars value={average} size="md" />
                <span className="text-sm text-muted-foreground num">
                  {count} {count === 1 ? "review" : "reviews"}
                </span>
              </div>
            </div>
            <ol className="flex flex-col gap-1.5" aria-label="Rating breakdown">
              {bars.map((star) => {
                const n = product.histogram[star];
                const pct = count ? Math.round((n / count) * 100) : 0;
                return (
                  <li key={star} className="flex items-center gap-3 text-sm num">
                    <span className="w-4 text-right">{star}</span>
                    <span className="h-1.5 flex-1 bg-muted" aria-hidden>
                      <span className="block h-full bg-talon" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-8 text-right text-muted-foreground">{n}</span>
                    <span className="sr-only">
                      {n} {n === 1 ? "review" : "reviews"} with {star} stars
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <ReviewList reviews={product.reviews} />
        </div>
      ) : null}
    </section>
  );
}
