import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { googleEnabled } from "@/lib/auth.config";
import { getSessionUser } from "@/lib/auth/guards";
import { safeNextPath } from "@/lib/auth/safe-next";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/account?welcome=1");
  if (await getSessionUser()) redirect(safeNextPath(params.next, "/account"));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl">Create an account</h1>
        <p className="text-sm text-muted-foreground">
          Faster checkout, order tracking and returns in one place.
        </p>
      </div>

      <RegisterForm next={next} googleEnabled={googleEnabled} />

      <p className="text-sm text-muted-foreground">
        Already have one?{" "}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="text-foreground underline underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
