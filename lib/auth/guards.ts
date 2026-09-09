import { notFound, redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";

/**
 * Server-side authorization helpers. Middleware keeps casual visitors out of
 * /account and /admin, but every server component, action and route handler
 * that touches protected data must call one of these too.
 */

export type SessionUser = {
  id: string;
  role: Role;
  email: string | null;
  name: string | null;
  image: string | null;
};

export const STAFF_ROLES: readonly Role[] = ["STAFF", "ADMIN"];
export const ADMIN_ROLES: readonly Role[] = ["ADMIN"];

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) return null;
  return {
    id: user.id,
    role: user.role,
    email: user.email ?? null,
    name: user.name ?? null,
    image: user.image ?? null,
  };
}

export function loginUrl(next?: string): string {
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}

export function hasRole(user: { role: Role } | null | undefined, roles: readonly Role[]): boolean {
  return Boolean(user) && roles.includes(user!.role);
}

/** Redirects to /login (with a return path) when there is no session. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(loginUrl(next));
  return user;
}

/**
 * Requires one of `roles`. Unauthenticated users go to /login; authenticated
 * users without the role get a 404 so protected areas are not discoverable.
 */
export async function requireRole(roles: readonly Role[], next?: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!hasRole(user, roles)) notFound();
  return user;
}

export function requireStaff(next = "/admin"): Promise<SessionUser> {
  return requireRole(STAFF_ROLES, next);
}

export function requireAdmin(next = "/admin"): Promise<SessionUser> {
  return requireRole(ADMIN_ROLES, next);
}
