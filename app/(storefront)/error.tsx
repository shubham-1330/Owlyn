"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { cn } from "@/lib/utils";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className={cn(CONTAINER, GUTTER, "flex flex-col items-start gap-4 py-24")}>
      <h1 className="text-2xl md:text-3xl">Something went wrong.</h1>
      <p className="measure text-muted-foreground">
        The page did not load. Try again, and if it keeps happening, tell us at the contact page.
        {error.digest ? ` Reference ${error.digest}.` : ""}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
