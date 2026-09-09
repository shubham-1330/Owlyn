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
const AUTH_PAGES = new Set(["/login", "/register"]);

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

  if (AUTH_PAGES.has(pathname) && user) {
    const next = nextUrl.searchParams.get("next");
    const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
    return NextResponse.redirect(new URL(target, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|favicon.ico|.*\\.[\\w]+$).*)"],
};
