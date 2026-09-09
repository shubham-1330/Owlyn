import Link from "next/link";

import { getSessionUser, hasRole, STAFF_ROLES } from "@/lib/auth/guards";

/**
 * Minimal storefront header used until the full header with the mega menu
 * lands in Phase 2.
 */
export async function SimpleHeader() {
  const user = await getSessionUser();
  return (
    <header className="flex items-center justify-between px-6 py-5">
      <Link href="/" className="wordmark text-xl">
        owlyn
      </Link>
      <nav aria-label="Account" className="flex items-center gap-5 text-sm">
        {user ? (
          <>
            {hasRole(user, STAFF_ROLES) ? (
              <Link href="/admin" className="text-muted-foreground hover:text-foreground">
                Admin
              </Link>
            ) : null}
            <Link href="/account" className="hover:text-primary">
              Account
            </Link>
          </>
        ) : (
          <Link href="/login" className="hover:text-primary">
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
