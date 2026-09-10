import { NextResponse } from "next/server";

import { getSessionUser, hasRole, STAFF_ROLES } from "@/lib/auth/guards";
import { getReturnPhoto } from "@/lib/returns/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Return photos are private: the request owner or staff, else 404. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ requestId: string; index: string }> },
) {
  const { requestId, index } = await params;
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0 || i > 20)
    return new NextResponse("Not found", { status: 404 });
  const user = await getSessionUser();
  const photo = await getReturnPhoto(requestId, i, {
    userId: user?.id ?? null,
    staff: hasRole(user, STAFF_ROLES),
  });
  if (!photo) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(photo.body), {
    status: 200,
    headers: { "Content-Type": photo.contentType, "Cache-Control": "private, no-store" },
  });
}
