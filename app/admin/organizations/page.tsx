"use client";

import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type Org = {
  id: number;
  name: string;
  _count: { members: number; teams: number };
};

export default function AdminOrganizationsPage() {
  const { data: session, status } = useSession();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/organizations");
    if (r.ok) setOrgs(await r.json());
  }, []);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") void load();
  }, [session?.user?.role, load]);

  async function onDeleteOrg(id: number, name: string) {
    if (
      !confirm(
        `Delete organization “${name}” and ALL sub-organizations, groups, scenes, players, screens, and content under it? This cannot be undone.`
      )
    ) {
      return;
    }
    setMsg(null);
    const r = await fetch(`/api/admin/organizations/${id}`, { method: "DELETE" });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setMsg(typeof d.error === "string" ? d.error : "Could not delete organization");
      return;
    }
    setMsg(`Deleted “${name}”.`);
    void load();
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/admin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setBusy(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setMsg(typeof d.error === "string" ? d.error : "Could not create");
      return;
    }
    setName("");
    setMsg(
      "Organization created. Invite an owner from Organization settings, or add sub-organizations there."
    );
    void load();
  }

  if (status === "loading") return <p className="text-slate-500">Loading…</p>;
  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Platform admins only.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <AdminBreadcrumb
        items={[{ label: "Dashboard", href: "/admin" }, { label: "Organizations" }]}
      />
      <div>
        <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900">
          Organizations
        </h1>
        <p className="mt-2 text-slate-600">
          Each organization has sub-organizations (content spaces), groups, and members. Create one per
          school or district, then invite an <strong>OWNER</strong> to manage coaches and managers.
        </p>
      </div>

      <form
        onSubmit={(e) => void onCreate(e)}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {msg ? <p className="w-full text-sm text-[#3d7d6c]">{msg}</p> : null}
        <div className="min-w-[200px] flex-1">
          <label className="text-xs font-semibold uppercase text-slate-500">New organization</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lincoln High Athletics"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#52A88E] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {orgs.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
            <div>
              <p className="font-semibold text-slate-900">{o.name}</p>
              <p className="text-sm text-slate-500">
                {o._count.members} member{o._count.members === 1 ? "" : "s"} · {o._count.teams} sub-org
                {o._count.teams === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a
                href={`/admin/organization?orgId=${o.id}`}
                className="text-sm font-semibold text-[#3d7d6c] underline"
              >
                Members & invites →
              </a>
              <button
                type="button"
                onClick={() => void onDeleteOrg(o.id, o.name)}
                className="text-sm font-semibold text-red-700 underline decoration-red-300 hover:text-red-800"
              >
                Delete org…
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
