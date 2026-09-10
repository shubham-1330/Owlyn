"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { Dialog, VisuallyHidden } from "radix-ui";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/** Drawer that hosts the server-rendered filter links on small screens. Closes on navigation. */
export function MobileFilters({
  activeCount,
  children,
}: {
  activeCount: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    setOpen(false);
  }, [pathname, search]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontal aria-hidden />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/70 data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-full max-w-sm flex-col bg-background text-foreground data-[state=closed]:animate-slide-out-left data-[state=open]:animate-slide-in-left lg:hidden"
        >
          <div className="flex h-16 shrink-0 items-center justify-between px-5">
            <Dialog.Title className="font-display text-lg font-bold tracking-tight">
              Filters
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close filters"
              className="-mr-2 inline-flex size-10 items-center justify-center rounded-sm hover:bg-ink/5"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-10">{children}</div>
          <VisuallyHidden.Root>
            <Dialog.Description>Filter the product list.</Dialog.Description>
          </VisuallyHidden.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
