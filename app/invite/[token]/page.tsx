"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type InviteInfo = {
  email: string;
  role: string;
  organizationName: string;
  accountExists: boolean;
};

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params.token ?? "").trim();
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const r = await fetch(`/api/invites/${encodeURIComponent(token)}`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(typeof data.error === "string" ? data.error : "Invalid invite");
      return;
    }
    setInfo(data as InviteInfo);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError("Invalid link");
      return;
    }
    void load();
  }, [token, load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!info) return;
    setBusy(true);
    setError(null);
    const r = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password,
        ...(info.accountExists ? {} : { name: name.trim() || undefined }),
      }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not accept invite");
      return;
    }
    router.replace("/login?invited=1");
  }

  if (error && !info) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
        <p className="text-center text-red-700">{error}</p>
        <Link href="/login" className="mt-6 text-center font-semibold text-[#3d7d6c] underline">
          Sign in
        </Link>
      </div>
    );
  }

  if (!info) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-slate-500">Loading invite…</div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <h1 className="font-gdl-display text-2xl font-bold text-slate-900">Join {info.organizationName}</h1>
      <p className="mt-2 text-slate-600">
        You&apos;ve been invited as <strong>{info.role}</strong> using <strong>{info.email}</strong>.
      </p>

      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {!info.accountExists ? (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Your name (optional)</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        ) : null}
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">
            {info.accountExists ? "Password (your account)" : "Choose password"}
          </label>
          <input
            type="password"
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-[#52A88E] py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-50"
        >
          {busy ? "Working…" : "Accept & join"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        Wrong person? <Link href="/login" className="text-[#3d7d6c] underline">Sign in</Link> with a
        different account.
      </p>
    </div>
  );
}
