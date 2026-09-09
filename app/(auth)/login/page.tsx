import type { Metadata } from "next";
import Link from "next/link";

import { googleEnabled } from "@/lib/auth.config";
import { safeNextPath } from "@/lib/auth/safe-next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email is already registered with a password. Sign in with it instead.",
  OAuthSignin: "Google sign-in could not start. Try again.",
  OAuthCallbackError: "Google sign-in was cancelled or failed. Try again.",
  AccessDenied: "That account cannot sign in right now.",
  Configuration: "Sign-in is misconfigured. Contact support.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; registered?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "/account");
  const authError = params.error
    ? (ERROR_MESSAGES[params.error] ?? "Sign-in failed. Try again.")
    : undefined;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Orders, returns and saved addresses live here.
        </p>
      </div>

      <LoginForm next={next} googleEnabled={googleEnabled} authError={authError} />

      <p className="text-sm text-muted-foreground">
        New to Owlyn?{" "}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className="text-foreground underline underline-offset-4"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
