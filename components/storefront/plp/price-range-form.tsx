import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/money";
import { serializeCatalogParams, type CatalogParams } from "@/lib/search-params";

/**
 * Plain GET form. Hidden inputs carry every other active param so submitting
 * keeps the rest of the state and lands on a URL the server parser owns.
 */
export function PriceRangeForm({
  path,
  params,
  bounds,
}: {
  path: string;
  params: CatalogParams;
  bounds: { min: number; max: number } | null;
}) {
  const others = new URLSearchParams(serializeCatalogParams({ ...params, price: null, page: 1 }));
  const min = params.price?.min !== undefined ? Math.round(params.price.min / 100) : "";
  const max = params.price?.max !== undefined ? Math.round(params.price.max / 100) : "";
  const placeholderMin = bounds ? String(Math.floor(bounds.min / 100)) : "0";
  const placeholderMax = bounds ? String(Math.ceil(bounds.max / 100)) : "";

  return (
    <form method="get" action={path} className="flex flex-col gap-3">
      {Array.from(others.entries()).map(([key, value]) => (
        <input key={`${key}=${value}`} type="hidden" name={key} value={value} />
      ))}
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="price-min">
          Minimum price in rupees
        </label>
        <Input
          id="price-min"
          name="price-min"
          type="number"
          inputMode="numeric"
          min={0}
          step={100}
          placeholder={placeholderMin}
          defaultValue={min}
          className="h-9 md:text-sm"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <label className="sr-only" htmlFor="price-max">
          Maximum price in rupees
        </label>
        <Input
          id="price-max"
          name="price-max"
          type="number"
          inputMode="numeric"
          min={0}
          step={100}
          placeholder={placeholderMax}
          defaultValue={max}
          className="h-9 md:text-sm"
        />
      </div>
      {bounds ? (
        <p className="text-xs text-muted-foreground num">
          {formatINR(bounds.min)} to {formatINR(bounds.max)} in this range
        </p>
      ) : null}
      <Button type="submit" variant="outline" size="sm" className="w-fit">
        Apply price
      </Button>
    </form>
  );
}
