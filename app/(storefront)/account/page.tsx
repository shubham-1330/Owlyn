import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/(auth)/actions";
import { FormMessage } from "@/components/forms/field";
import { SimpleHeader } from "@/components/storefront/simple-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { hasRole, requireUser, STAFF_ROLES } from "@/lib/auth/guards";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const [{ welcome }, sessionUser] = await Promise.all([searchParams, requireUser("/account")]);
  const user = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: { select: { addresses: true, orders: true, wishlistItems: true } },
    },
  });
  if (!user) return null;

  const joined = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(user.createdAt);

  return (
    <>
      <SimpleHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-10">
        <div className="flex flex-col gap-3">
          {welcome === "1" ? (
            <FormMessage tone="success">Your account is ready.</FormMessage>
          ) : null}
          <h1 className="text-2xl">{user.name ?? "Your account"}</h1>
          <p className="text-muted-foreground">Member since {joined}.</p>
        </div>

        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Mobile</dt>
            <dd className="num">{user.phone ?? "Not added"}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Orders</dt>
            <dd className="num">{user._count.orders}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Saved addresses</dt>
            <dd className="num">{user._count.addresses}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          {hasRole(user, STAFF_ROLES) ? (
            <>
              <Badge variant="brass">{user.role === "ADMIN" ? "Admin" : "Staff"}</Badge>
              <Button asChild variant="outline">
                <Link href="/admin">Open admin</Link>
              </Button>
            </>
          ) : null}
          <form action={signOutAction}>
            <Button type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>
      </main>
    </>
  );
}
