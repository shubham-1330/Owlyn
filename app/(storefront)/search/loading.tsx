import { CONTAINER, GUTTER } from "@/lib/layout";
import { cn } from "@/lib/utils";

export default function SearchLoading() {
  return (
    <div className={cn(CONTAINER, GUTTER, "flex flex-col gap-8 py-12 md:py-16")} aria-busy>
      <div className="h-9 w-40 bg-slate" />
      <div className="h-10 w-full max-w-xl bg-slate" />
      <div className="h-4 w-32 bg-slate" />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex flex-col gap-3">
            <div className="aspect-[3/4] bg-slate" />
            <div className="h-4 w-3/4 bg-slate" />
            <div className="h-3 w-1/3 bg-slate" />
          </li>
        ))}
      </ul>
    </div>
  );
}
