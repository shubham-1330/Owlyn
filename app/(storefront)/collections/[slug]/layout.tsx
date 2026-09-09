import { notFound } from "next/navigation";

import { resolveListingScope } from "@/lib/catalog/scope";

/**
 * Existence check above the route's loading boundary. Streaming starts once
 * the shell (layouts) resolves, so deciding here is what turns an unknown
 * slug into a real 404 status for every client, not only for bots. The
 * resolver is cached, so the page's own call costs nothing extra.
 */
export default async function CollectionLayout({
  params,
  children,
}: Readonly<{ params: Promise<{ slug: string }>; children: React.ReactNode }>) {
  const { slug } = await params;
  const listing = await resolveListingScope(slug);
  if (!listing) notFound();
  return children;
}
