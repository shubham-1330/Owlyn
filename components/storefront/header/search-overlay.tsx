"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, VisuallyHidden } from "radix-ui";
import { useState } from "react";

import { useRecentSearches } from "@/hooks/use-recent-searches";
import { GUTTER } from "@/lib/layout";
import { cn } from "@/lib/utils";

const chip =
  "rounded-sm border border-border px-3 py-1.5 text-sm transition-colors hover:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function SearchOverlay({
  open,
  onOpenChange,
  trending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trending: string[];
}) {
  const router = useRouter();
  const { recent, add, clear } = useRecentSearches();
  const [query, setQuery] = useState("");

  function go(term: string) {
    const clean = term.trim();
    if (!clean) return;
    add(clean);
    onOpenChange(false);
    setQuery("");
    router.push(`/search?q=${encodeURIComponent(clean)}`);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/70 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 top-0 z-50 border-b border-border bg-slate text-foreground data-[state=open]:animate-slide-down"
        >
          <Dialog.Title asChild>
            <VisuallyHidden.Root>Search</VisuallyHidden.Root>
          </Dialog.Title>

          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              go(query);
            }}
            className={cn("mx-auto flex h-16 w-full max-w-3xl items-center gap-3", GUTTER)}
          >
            <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              type="search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              aria-label="Search products"
              autoComplete="off"
              enterKeyHint="search"
              className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <Dialog.Close
              aria-label="Close search"
              className="-mr-2 inline-flex size-10 shrink-0 items-center justify-center rounded-sm hover:bg-ink/5"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </form>

          <div className={cn("mx-auto flex w-full max-w-3xl flex-col gap-6 pt-2 pb-8", GUTTER)}>
            {recent.length > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Recent</p>
                  <button
                    type="button"
                    onClick={clear}
                    className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {recent.map((term) => (
                    <li key={term}>
                      <button type="button" onClick={() => go(term)} className={chip}>
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {trending.length > 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">Trending</p>
                <ul className="flex flex-wrap gap-2">
                  {trending.map((term) => (
                    <li key={term}>
                      <button type="button" onClick={() => go(term)} className={chip}>
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
