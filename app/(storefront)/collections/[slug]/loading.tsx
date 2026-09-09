import { CONTAINER, GUTTER } from "@/lib/layout";
import { cn } from "@/lib/utils";

export default function CollectionLoading() {
  return (
    <div className={cn(CONTAINER, GUTTER, "flex flex-col gap-8 py-8 md:py-12")} aria-busy>
      <div className="flex flex-col gap-4">
        <div className="h-4 w-48 bg-slate" />
        <div className="h-9 w-64 bg-slate" />
        <div className="h-4 w-96 max-w-full bg-slate" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-slate" />
        <div className="h-9 w-40 bg-slate" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
        <div className="hidden flex-col gap-6 lg:flex" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-4 w-20 bg-slate" />
              <div className="h-3 w-32 bg-slate" />
              <div className="h-3 w-28 bg-slate" />
            </div>
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex flex-col gap-3">
              <div className="aspect-[3/4] bg-slate" />
              <div className="h-4 w-3/4 bg-slate" />
              <div className="h-3 w-1/3 bg-slate" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
