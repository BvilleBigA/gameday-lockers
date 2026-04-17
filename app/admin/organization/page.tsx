"use client";

import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

type Member = {
  id: number;
  role: string;
  user: { id: string; email: string; name: string | null };
};

type Invite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

type AdminOrgRow = {
  id: number;
  name: string;
  _count: { members: number; teams: number };
};

type OrgTeamRow = {
  id: number;
  name: string;
  organization?: { id: number; name: string };
};

function OrgSettingsInner() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const orgIdQs = searchParams.get("orgId");

  const memberships = session?.user?.orgMemberships ?? [];
  const isAdmin = session?.user?.role === "ADMIN";
  const owned = memberships.filter((m) => m.role === "OWNER");

  const [orgId, setOrgId] = useState<number | null>(null);
  const [resolvedOrgName, setResolvedOrgName] = useState<string | null>(null);
  const [adminOrgList, setAdminOrgList] = useState<AdminOrgRow[]>([]);
  const [adminOrgsLoading, setAdminOrgsLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"COACH" | "MANAGER" | "OWNER">("COACH");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [subOrgs, setSubOrgs] = useState<OrgTeamRow[]>([]);
  const [subOrgsLoading, setSubOrgsLoading] = useState(false);
  const [newSubOrgName, setNewSubOrgName] = useState("");
  const [subOrgBusy, setSubOrgBusy] = useState(false);
  const [subOrgErr, setSubOrgErr] = useState<string | null>(null);

  useEffect(() => {
    const n = orgIdQs ? Number(orgIdQs) : NaN;
    if (Number.isFinite(n)) {
      setOrgId(n);
      return;
    }
    if (!isAdmin && owned.length === 1) setOrgId(owned[0].organizationId);
  }, [orgIdQs, owned, isAdmin]);

  useEffect(() => {
    if (!isAdmin || orgId != null) return;
    let cancelled = false;
    setAdminOrgsLoading(true);
    void (async () => {
      const r = await fetch("/api/admin/organizations");
      if (!r.ok) {
        if (!cancelled) {
          setAdminOrgList([]);
          setAdminOrgsLoading(false);
        }
        return;
      }
      const data = (await r.json()) as AdminOrgRow[];
      if (!cancelled) {
        setAdminOrgList(Array.isArray(data) ? data : []);
        setAdminOrgsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, orgId]);

  useEffect(() => {
    if (orgId == null) {
      setResolvedOrgName(null);
      return;
    }
    let cancelled = false;
    setResolvedOrgName(null);
    void (async () => {
      const r = await fetch(`/api/organizations/${orgId}`);
      if (!r.ok || cancelled) return;
      const d = (await r.json()) as { name?: string };
      if (!cancelled && typeof d.name === "string") {
        setResolvedOrgName(d.name);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const load = useCallback(async () => {
    if (orgId == null) return;
    setErr(null);
    const [m, i] = await Promise.all([
      fetch(`/api/organizations/${orgId}/members`),
      fetch(`/api/organizations/${orgId}/invites`),
    ]);
    if (!m.ok) {
      setErr(m.status === 403 ? "You can’t manage this organization." : "Could not load members.");
      return;
    }
    setMembers(await m.json());
    if (i.ok) setInvites(await i.json());
  }, [orgId]);

  const loadSubOrgs = useCallback(async () => {
    if (orgId == null) return;
    setSubOrgErr(null);
    setSubOrgsLoading(true);
    const r = await fetch("/api/teams");
    setSubOrgsLoading(false);
    if (!r.ok) {
      setSubOrgErr("Could not load sub-organizations.");
      setSubOrgs([]);
      return;
    }
    const rows = (await r.json()) as OrgTeamRow[];
    const list = Array.isArray(rows) ? rows.filter((t) => t.organization?.id === orgId) : [];
    list.sort((a, b) => a.name.localeCompare(b.name));
    setSubOrgs(list);
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadSubOrgs();
  }, [loadSubOrgs]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (orgId == null || !email.trim()) return;
    setBusy(true);
    setToast(null);
    const r = await fetch(`/api/organizations/${orgId}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setToast(typeof data.error === "string" ? data.error : "Could not send invite");
      return;
    }
    setEmail("");
    setToast(`Invite link: ${window.location.origin}${data.inviteUrl ?? ""}`);
    void load();
  }

  async function addSubOrg(e: React.FormEvent) {
    e.preventDefault();
    if (orgId == null || !newSubOrgName.trim()) return;
    setSubOrgBusy(true);
    setSubOrgErr(null);
    const r = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSubOrgName.trim(), organizationId: orgId }),
    });
    const data = await r.json().catch(() => ({}));
    setSubOrgBusy(false);
    if (!r.ok) {
      setSubOrgErr(typeof data.error === "string" ? data.error : "Could not create sub-organization");
      return;
    }
    setNewSubOrgName("");
    void loadSubOrgs();
  }

  async function removeMember(userId: string) {
    if (orgId == null || !confirm("Remove this member from the organization?")) return;
    const r = await fetch(`/api/organizations/${orgId}/members?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      alert(typeof d.error === "string" ? d.error : "Could not remove");
      return;
    }
    void load();
  }

  if (status === "loading") return <p className="text-slate-500">Loading…</p>;

  if (!isAdmin && owned.length === 0) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Only organization owners can manage invites and members.
      </div>
    );
  }

  if (orgId == null) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", href: "/admin" },
            ...(isAdmin ? [{ label: "Organizations", href: "/admin/organizations" }] : []),
            { label: "Organization" },
          ]}
        />
        <div>
          <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900">
            Choose organization
          </h1>
          <p className="mt-2 text-slate-600">
            {isAdmin
              ? "As a platform admin you can open any organization to manage members and invites."
              : "Select an organization you own."}
          </p>
        </div>

        {isAdmin ? (
          adminOrgsLoading ? (
            <p className="text-slate-500">Loading organizations…</p>
          ) : adminOrgList.length === 0 ? (
            <p className="text-slate-600">
              No organizations yet. Create one under{" "}
              <a href="/admin/organizations" className="font-semibold text-[#3d7d6c] underline">
                Organizations
              </a>
              .
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {adminOrgList.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{o.name}</p>
                    <p className="text-sm text-slate-500">
                      {o._count.members} member{o._count.members === 1 ? "" : "s"} ·{" "}
                      {o._count.teams} sub-org
                      {o._count.teams === 1 ? "" : "s"}
                    </p>
                  </div>
                  <a
                    href={`/admin/organization?orgId=${o.id}`}
                    className="text-sm font-semibold text-[#3d7d6c] underline"
                  >
                    Members & invites →
                  </a>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul className="space-y-2">
            {owned.map((m) => (
              <li key={m.organizationId}>
                <a
                  href={`/admin/organization?orgId=${m.organizationId}`}
                  className="font-semibold text-[#3d7d6c] underline"
                >
                  {m.organizationName}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const orgName =
    resolvedOrgName ??
    memberships.find((m) => m.organizationId === orgId)?.organizationName ??
    null;

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <AdminBreadcrumb
        items={[
          { label: "Dashboard", href: "/admin" },
          ...(isAdmin ? [{ label: "Organizations", href: "/admin/organizations" }] : []),
          { label: orgName ?? "Organization" },
        ]}
      />
      <div>
        <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900">
          {orgName ?? "Loading…"}
        </h1>
        <p className="mt-2 text-slate-600">
          Add sub-organizations for programs, sites, or departments—each has its own content, groups, and
          displays. Invite coaches and managers at the organization level; they get iPad live control;
          coaches and owners can also edit content and scenes.
        </p>
      </div>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Sub-organizations</h2>
          <p className="mt-1 text-sm text-slate-600">
            Separate content spaces under this organization—each can have its own groups, roster, scenes, and
            paired displays.
          </p>
        </div>
        {subOrgErr ? <p className="text-sm text-red-600">{subOrgErr}</p> : null}
        {subOrgsLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : subOrgs.length === 0 ? (
          <p className="text-sm text-slate-600">No sub-organizations yet. Add one below.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {subOrgs.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <span className="font-medium text-slate-900">{t.name}</span>
                <a
                  href={`/admin/teams?focusTeam=${t.id}`}
                  className="font-semibold text-[#3d7d6c] underline"
                >
                  Content &amp; groups →
                </a>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={(e) => void addSubOrg(e)} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1">
            <label htmlFor="new-suborg-name" className="text-xs font-semibold uppercase text-slate-500">
              New sub-organization name
            </label>
            <input
              id="new-suborg-name"
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="e.g. Varsity, North campus, Spring league"
              value={newSubOrgName}
              onChange={(e) => setNewSubOrgName(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={subOrgBusy || !newSubOrgName.trim()}
            className="rounded-lg bg-[#52A88E] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-50"
          >
            {subOrgBusy ? "Adding…" : "Add"}
          </button>
        </form>
      </section>

      {err ? <p className="text-red-600">{err}</p> : null}

      <form
        onSubmit={(e) => void sendInvite(e)}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Send invite</h2>
        {toast ? <p className="text-sm text-[#3d7d6c]">{toast}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase text-slate-500">Email</label>
            <input
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Role</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as "COACH" | "MANAGER" | "OWNER")}
            >
              <option value="COACH">Coach (content + control)</option>
              <option value="MANAGER">Manager (control only)</option>
              {isAdmin ? <option value="OWNER">Owner (invites + content)</option> : null}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#52A88E] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-50"
        >
          {busy ? "Sending…" : "Create invite link"}
        </button>
      </form>

      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Members</h2>
        <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-medium text-slate-900">{m.user.email}</p>
                {m.user.name ? <p className="text-slate-500">{m.user.name}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-600">
                  {m.role}
                </span>
                {m.user.id !== session?.user?.id ? (
                  <button
                    type="button"
                    onClick={() => void removeMember(m.user.id)}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {invites.length > 0 ? (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Pending invites</h2>
          <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white text-sm">
            {invites.map((i) => (
              <li key={i.id} className="px-4 py-3">
                <span className="font-medium text-slate-900">{i.email}</span>{" "}
                <span className="text-slate-500">({i.role})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function OrganizationSettingsPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <OrgSettingsInner />
    </Suspense>
  );
}
