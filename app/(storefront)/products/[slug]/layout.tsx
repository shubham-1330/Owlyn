import { notFound } from "next/navigation";

import { getProductDetail } from "@/lib/queries/product";

/**
 * Existence check above the route's loading boundary so an unknown product
 * slug returns a real 404 status. The detail query is cached and deduplicated
 * within the request, so the page's call reuses this result.
 */
export default async function ProductLayout({
  params,
  children,
}: Readonly<{ params: Promise<{ slug: string }>; children: React.ReactNode }>) {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) notFound();
  return children;
}
