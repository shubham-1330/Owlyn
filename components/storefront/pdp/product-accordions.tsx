import { Markdown } from "@/components/storefront/markdown";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatINR } from "@/lib/money";
import type { ProductDetail } from "@/lib/queries/product";
import type { StoreConfig } from "@/lib/queries/settings";

export function ProductAccordions({
  product,
  config,
}: {
  product: ProductDetail;
  config: StoreConfig;
}) {
  return (
    <Accordion type="multiple" defaultValue={["description"]} className="border-t border-border">
      <AccordionItem value="description">
        <AccordionTrigger>Description</AccordionTrigger>
        <AccordionContent>
          <Markdown content={product.description} className="text-sm" />
          {product.attributes.length > 0 ? (
            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {product.attributes.map((a) => (
                <div key={`${a.slug}-${a.valueSlug}`} className="flex flex-col">
                  <dt className="text-muted-foreground">{a.attribute}</dt>
                  <dd>{a.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </AccordionContent>
      </AccordionItem>

      {product.materials || product.careInstructions ? (
        <AccordionItem value="materials">
          <AccordionTrigger>Materials and care</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3">
            {product.materials ? <p>{product.materials}</p> : null}
            {product.careInstructions ? (
              <p className="text-muted-foreground">{product.careInstructions}</p>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      ) : null}

      <AccordionItem value="shipping">
        <AccordionTrigger>Shipping and returns</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2">
          <p>
            Free standard shipping over {formatINR(config.freeShippingThreshold)}. Metro cities in 2
            to 4 days, the rest of India in 4 to 7. Cash on delivery on orders up to{" "}
            {formatINR(config.codLimit)}.
          </p>
          <p className="text-muted-foreground">
            {config.returnsWindowDays}-day returns, unworn with tags. Size exchanges are free.
            Faults are covered for {config.warrantyDays} days.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
