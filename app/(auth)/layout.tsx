import Link from "next/link";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="wordmark text-xl">
          owlyn
        </Link>
      </header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 pb-24">
        {children}
      </main>
    </div>
  );
}
