"use client";

import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");

  const load = useCallback(async () => {
    setLoadError(null);
    const r = await fetch("/api/admin/users");
    if (!r.ok) {
      setLoadError(r.status === 403 ? "Admins only." : "Could not load users.");
      return;
    }
    setUsers(await r.json());
  }, []);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") void load();
  }, [session?.user?.role, load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    const r = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        name: name.trim() || undefined,
        password,
        role,
      }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setFormError(typeof data.error === "string" ? data.error : "Could not create user");
      return;
    }
    setEmail("");
    setName("");
    setPassword("");
    setRole("USER");
    void load();
  }

  if (status === "loading") {
    return <p className="text-slate-500">Loading…</p>;
  }

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <p className="font-semibold">Admins only</p>
        <p className="mt-1 text-sm">Your account does not have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <AdminBreadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Users" }]} />
      <div>
        <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900 md:text-3xl">
          Users & onboarding
        </h1>
        <p className="mt-2 text-slate-600">
          Create accounts for coaches and equipment staff. Share the temporary password securely; they
          can sign in at <span className="font-mono text-sm">/login</span>.
        </p>
      </div>

      <form
        onSubmit={(e) => void onCreate(e)}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Add user</h2>
        {formError ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{formError}</p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase text-slate-500">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Display name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "USER" | "ADMIN")}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="USER">Standard (dashboard + control)</option>
              <option value="ADMIN">Admin (includes user management)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase text-slate-500">
              Initial password (min 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#52A88E] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create user"}
        </button>
      </form>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">All users</h2>
        {loadError ? <p className="mt-2 text-sm text-red-600">{loadError}</p> : null}
        <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{u.email}</p>
                {u.name ? <p className="text-slate-500">{u.name}</p> : null}
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                  u.role === "ADMIN" ? "bg-[#52A88E]/20 text-[#3d7d6c]" : "bg-slate-100 text-slate-600"
                }`}
              >
                {u.role}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
