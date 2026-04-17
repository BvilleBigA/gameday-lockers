"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export function SiteHeader() {
  const { data: session, status } = useSession();
  const signOutUrl = typeof window === "undefined" ? "/" : `${window.location.origin}/`;

  return (
    <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="font-gdl-display text-sm font-bold uppercase tracking-widest text-slate-900">
          Gameday Lockers
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          {status === "loading" ? (
            <span className="text-slate-400">…</span>
          ) : session ? (
            <>
              <Link href="/admin" className="font-medium text-[#7d6a3a] hover:text-[#c4a052]">
                Dashboard
              </Link>
              <Link href="/control" className="font-medium text-slate-600 hover:text-slate-900">
                Live control
              </Link>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: signOutUrl })}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium text-slate-600 hover:text-slate-900">
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-[#c4a052] px-3 py-1.5 font-semibold text-black hover:bg-[#e3c76d]"
              >
                Create account
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
