import { NewsletterForm } from "@/components/storefront/newsletter-form";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { cn } from "@/lib/utils";

export function NewsletterSection() {
  return (
    <section className="bg-slate py-16 md:py-24" aria-labelledby="newsletter-heading">
      <div className={cn(CONTAINER, GUTTER, "grid gap-8 md:grid-cols-2 md:items-center")}>
        <div className="flex flex-col gap-3">
          <h2 id="newsletter-heading" className="text-2xl md:text-3xl">
            Early word on new drops.
          </h2>
          <p className="measure text-muted-foreground">
            Small runs sell out. Subscribers hear first, and hear rarely.
          </p>
        </div>
        <NewsletterForm source="home" />
      </div>
    </section>
  );
}
