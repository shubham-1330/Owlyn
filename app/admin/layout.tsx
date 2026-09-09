import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/app/(auth)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Owlyn admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await requireStaff();

  return (
    <div className="theme-admin min-h-dvh bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border bg-card px-6 py-3">
        <div className="flex items-baseline gap-3">
          <Link href="/admin" className="wordmark text-lg">
            owlyn
          </Link>
          <span className="text-sm text-muted-foreground">Admin</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden sm:inline">{user.email}</span>
          <Badge variant="muted">{user.role === "ADMIN" ? "Admin" : "Staff"}</Badge>
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            Storefront
          </Link>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  );
}
