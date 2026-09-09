import Link from "next/link";

import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Owlyn home"
      className={cn("inline-block wordmark text-[22px]", className)}
    >
      owlyn
    </Link>
  );
}
