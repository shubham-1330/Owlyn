import type { Metadata } from "next";
import Link from "next/link";

import { Wordmark } from "@/components/storefront/wordmark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-6 py-5">
        <Wordmark />
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-5 px-6 pb-24">
        <p className="text-sm text-muted-foreground num">404</p>
        <h1 className="text-2xl md:text-3xl">This page does not exist.</h1>
        <p className="measure text-muted-foreground">
          The link may be old, or the product may have moved. The store is one tap away.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild>
            <Link href="/">Back to the store</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/search">Search</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
