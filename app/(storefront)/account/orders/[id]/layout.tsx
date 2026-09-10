import { notFound } from "next/navigation";

import { requireUser } from "@/lib/auth/guards";
import { orderExistsForUser } from "@/lib/orders/queries";

/**
 * Sits above the loading boundary so an unknown id, or another customer's
 * id, is a real 404 response rather than a streamed 200. The page below
 * still scopes its own query by userId; this is the status code, not the
 * authorisation.
 */
export default async function OrderSegmentLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const [{ id }, user] = await Promise.all([params, requireUser("/account/orders")]);
  if (!(await orderExistsForUser(id, user.id))) notFound();
  return children;
}
