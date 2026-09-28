import Link from "next/link";
import type { ReactNode } from "react";

/** Sign-in and password pages: a single centred panel. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <Link href="/" className="font-serif text-2xl text-ink">
            Ibrahim All-Mamun
          </Link>
          <p className="label">Portfolio admin</p>
        </div>
        <div className="rounded-md border border-rule bg-elevated p-6 shadow-popover">
          {children}
        </div>
      </div>
    </main>
  );
}
