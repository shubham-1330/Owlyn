import { CONTAINER, GUTTER } from "@/lib/layout";
import { cn } from "@/lib/utils";

export default function ProductLoading() {
  return (
    <div className={cn(CONTAINER, GUTTER, "flex flex-col gap-12 py-6 md:py-10")} aria-busy>
      <div className="h-4 w-64 bg-slate" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        <div className="grid gap-3 lg:grid-cols-[4rem_minmax(0,1fr)] lg:gap-4">
          <div className="hidden flex-col gap-2 lg:flex" aria-hidden>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] w-16 bg-slate" />
            ))}
          </div>
          <div className="aspect-[3/4] w-full bg-slate" />
        </div>
        <div className="flex flex-col gap-6" aria-hidden>
          <div className="h-3 w-16 bg-slate" />
          <div className="h-9 w-3/4 bg-slate" />
          <div className="h-7 w-32 bg-slate" />
          <div className="h-4 w-full bg-slate" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="size-9 bg-slate" />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 bg-slate" />
            ))}
          </div>
          <div className="h-12 w-full bg-slate" />
        </div>
      </div>
    </div>
  );
}
