import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/guards";
import { getInvoiceFile } from "@/lib/invoices/service";
import { canAccessOrder } from "@/lib/orders/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Invoice download. Ownership is checked in the data layer; a wrong id, a
 * missing token or someone else's order all get the same 404.
 */
export async function GET(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const url = new URL(request.url);
  const user = await getSessionUser();
  const allowed = await canAccessOrder(orderId, {
    userId: user?.id ?? null,
    token: url.searchParams.get("t"),
  });
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  let file: { body: Buffer; filename: string } | null;
  try {
    file = await getInvoiceFile(orderId);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.body), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
