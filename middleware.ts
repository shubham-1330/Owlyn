import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";

/**
 * Route protection at the edge. This is a convenience layer only: every
 * protected page and action re-checks authorization on the server via
 * lib/auth/guards.ts.
 */
const { auth } = NextAuth(authConfig);

const STAFF_ROLES = new Set(["STAFF", "ADMIN"]);

export default auth((request) => {
  const { nextUrl } = request;
  const { pathname, search } = nextUrl;
  const user = request.auth?.user;

  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = new URL("/login", nextUrl);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
    if (!STAFF_ROLES.has(user.role)) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/account")) {
    if (!user) {
      const url = new URL("/login", nextUrl);
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Signed-in visitors are bounced off /login and /register by those pages
  // themselves, with the full session check. The edge only sees that a JWT
  // exists, not whether it is still valid (a password change invalidates
  // other sessions), and bouncing here would loop a stale cookie between
  // /login and /account.
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico|.*\\.[\\w]+$).*)"],
};
