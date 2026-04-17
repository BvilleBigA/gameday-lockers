"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const redirectTo =
    callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        redirectTo,
      }),
    });
    const raw = await r.text();
    let data: { error?: string; redirectTo?: string; ok?: boolean } = {};
    try {
      data = raw ? (JSON.parse(raw) as typeof data) : {};
    } catch {
      data = {};
    }
    setBusy(false);
    if (!r.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : `Sign-in failed (HTTP ${r.status}).`
      );
      return;
    }
    router.push(typeof data.redirectTo === "string" ? data.redirectTo : redirectTo);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900">
        Sign in
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Use your facility account to open the dashboard and live control.
      </p>
      {searchParams.get("registered") === "1" ? (
        <p className="mt-4 rounded-md bg-[#52A88E]/15 px-3 py-2 text-sm text-[#3d7d6c]">
          Account created. Sign in below.
        </p>
      ) : null}
      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        <div>
          <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#52A88E] py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        No account?{" "}
        <Link href="/signup" className="font-semibold text-[#3d7d6c] hover:underline">
          Create one
        </Link>
      </p>
      <p className="mt-4 text-center">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← Back to site
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh w-full flex-1 flex-col justify-center bg-slate-50 px-6 py-16">
      <Suspense fallback={<p className="text-center text-slate-500">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
