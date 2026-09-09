import Link from "next/link";

import { catalogHref, type CatalogParams } from "@/lib/search-params";

/** Crawlable prev/next. Load more handles the human path; this handles the robot path. */
export function Pagination({
  path,
  params,
  pageCount,
}: {
  path: string;
  params: CatalogParams;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;
  const page = params.page;
  const prev =
    page > 1 ? catalogHref(path, { ...params, page: page - 1 }, { keepPage: true }) : null;
  const next =
    page < pageCount ? catalogHref(path, { ...params, page: page + 1 }, { keepPage: true }) : null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-6 text-sm">
      {prev ? (
        <Link href={prev} className="underline underline-offset-4 hover:text-primary">
          Previous page
        </Link>
      ) : (
        <span className="text-muted-foreground">Previous page</span>
      )}
      <span className="text-muted-foreground num">
        Page {page} of {pageCount}
      </span>
      {next ? (
        <Link href={next} className="underline underline-offset-4 hover:text-primary">
          Next page
        </Link>
      ) : (
        <span className="text-muted-foreground">Next page</span>
      )}
    </nav>
  );
}
