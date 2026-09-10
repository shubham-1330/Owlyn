import { signOutAction } from "@/app/(auth)/actions";
import { AccountNav } from "@/components/storefront/account/account-nav";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { CONTAINER, GUTTER } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * Account shell: a sign-in gate and the section nav. It knows nothing about
 * which order or address a page is showing; every page and action below
 * checks ownership in its own query.
 */
export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireUser("/account");
  return (
    <div className={cn(CONTAINER, GUTTER, "py-10 md:py-14")}>
      <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
        <div className="flex flex-col gap-6">
          <AccountNav />
          <form action={signOutAction} className="hidden lg:block">
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
        <div className="flex min-w-0 flex-col gap-8">{children}</div>
      </div>
    </div>
  );
}
