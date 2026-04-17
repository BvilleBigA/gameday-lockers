"use client";

import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

type Group = { id: number; name: string; teamId: number };
type Team = {
  id: number;
  name: string;
  groups: Group[];
  organization?: { id: number; name: string };
};

type OrgRow = { id: number; name: string };

function TeamsInner() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const memberships = session?.user?.orgMemberships ?? [];
  const editableOrgIds = useMemo(
    () =>
      memberships
        .filter((m) => m.role === "OWNER" || m.role === "COACH")
        .map((m) => m.organizationId),
    [memberships]
  );

  const searchParams = useSearchParams();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [groupNames, setGroupNames] = useState<Record<number, string>>({});
  const [editTeam, setEditTeam] = useState<Record<number, string>>({});
  const [adminOrgs, setAdminOrgs] = useState<OrgRow[]>([]);
  const [newTeamOrgId, setNewTeamOrgId] = useState<number | "">("");

  const load = useCallback(async () => {
    const r = await fetch("/api/teams");
    setTeams(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      const r = await fetch("/api/admin/organizations");
      if (!r.ok) return;
      const rows: OrgRow[] = await r.json();
      setAdminOrgs(rows);
      setNewTeamOrgId((prev) => {
        if (prev !== "") return prev;
        return rows.length === 1 ? rows[0].id : "";
      });
    })();
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) return;
    if (editableOrgIds.length === 1) {
      setNewTeamOrgId(editableOrgIds[0]);
    } else {
      setNewTeamOrgId("");
    }
  }, [isAdmin, editableOrgIds]);

  useEffect(() => {
    const focus = searchParams.get("focusTeam");
    if (!focus || teams.length === 0) return;
    const el = document.getElementById(`team-${focus}`);
    if (el) {
      window.requestAnimationFrame(() =>
        el.scrollIntoView({ behavior: "smooth", block: "start" })
      );
    }
  }, [searchParams, teams]);

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim()) return;
    const oid =
      typeof newTeamOrgId === "number" && Number.isFinite(newTeamOrgId) ? newTeamOrgId : undefined;
    const body: { name: string; organizationId?: number } = { name: teamName.trim() };
    if (oid !== undefined) body.organizationId = oid;
    const r = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      alert(typeof data.error === "string" ? data.error : "Could not create team");
      return;
    }
    setTeamName("");
    load();
  }

  const orgChoices: OrgRow[] = isAdmin
    ? adminOrgs
    : editableOrgIds.map((id) => {
        const m = memberships.find((x) => x.organizationId === id);
        return { id, name: m?.organizationName ?? `Org ${id}` };
      });
  const showOrgPicker = isAdmin || orgChoices.length > 1;

  async function saveTeam(id: number) {
    const name = editTeam[id]?.trim();
    if (!name) return;
    await fetch(`/api/teams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setEditTeam((m) => {
      const n = { ...m };
      delete n[id];
      return n;
    });
    load();
  }

  async function deleteTeam(id: number) {
    if (!confirm("Delete this team and related data where allowed?")) return;
    await fetch(`/api/teams/${id}`, { method: "DELETE" });
    load();
  }

  async function addGroup(teamId: number) {
    const name = (groupNames[teamId] ?? "").trim();
    if (!name) return;
    await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, name }),
    });
    setGroupNames((m) => ({ ...m, [teamId]: "" }));
    load();
  }

  async function deleteGroup(id: number) {
    if (!confirm("Delete this group?")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) {
    return <p className="text-slate-500">Loading teams…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AdminBreadcrumb
        items={[{ label: "Dashboard", href: "/admin" }, { label: "Groups" }]}
      />
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight text-slate-900 md:text-3xl">
          Locker groups
        </h1>
        <p className="mt-2 text-sm text-slate-600 md:text-base">
          Customize messaging and nameplates by group — offense, defense, recruits, and more.
        </p>
      </div>

      <form
        onSubmit={addTeam}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        {showOrgPicker ? (
          <div className="min-w-[200px]">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Organization
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2"
              value={newTeamOrgId === "" ? "" : String(newTeamOrgId)}
              onChange={(e) => {
                const v = e.target.value;
                setNewTeamOrgId(v === "" ? "" : Number(v));
              }}
              required
            >
              {orgChoices.length > 1 ? <option value="">Select organization…</option> : null}
              {orgChoices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="min-w-[200px] flex-1">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
            New team
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-slate-400 focus:ring-2"
            placeholder="e.g. Football"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={
            showOrgPicker &&
            (orgChoices.length === 0 || newTeamOrgId === "" || !Number.isFinite(Number(newTeamOrgId)))
          }
          className="rounded-lg bg-[#52A88E] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add team
        </button>
      </form>

      {isAdmin && !loading && adminOrgs.length === 0 ? (
        <p className="text-sm text-amber-800">
          Add an organization first under{" "}
          <a href="/admin/organizations" className="font-medium underline">
            Organizations
          </a>
          .
        </p>
      ) : null}

      <div className="space-y-4">
        {teams.map((team) => (
          <div
            key={team.id}
            id={`team-${team.id}`}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm scroll-mt-6"
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              {editTeam[team.id] !== undefined ? (
                <>
                  <input
                    className="min-w-[160px] flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    value={editTeam[team.id]}
                    onChange={(e) =>
                      setEditTeam((m) => ({ ...m, [team.id]: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    onClick={() => saveTeam(team.id)}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditTeam((m) => {
                        const n = { ...m };
                        delete n[team.id];
                        return n;
                      })
                    }
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </>
                           ) : (
                <>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900">{team.name}</h2>
                    {team.organization ? (
                      <p className="text-xs text-slate-500">{team.organization.name}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditTeam((m) => ({ ...m, [team.id]: team.name }))}
                    className="text-sm text-slate-600 hover:text-slate-900"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTeam(team.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete team
                  </button>
                </>
              )}
            </div>
            <div className="p-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Groups
              </p>
              <ul className="space-y-2">
                {team.groups.map((g) => (
                  <li
                    key={g.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <span className="text-sm text-slate-800">{g.name}</span>
                    <button
                      type="button"
                      onClick={() => deleteGroup(g.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  className="min-w-[180px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="New group name"
                  value={groupNames[team.id] ?? ""}
                  onChange={(e) =>
                    setGroupNames((m) => ({ ...m, [team.id]: e.target.value }))
                  }
                />
                <button
                  type="button"
                  onClick={() => addGroup(team.id)}
                  className="rounded-lg bg-[#52A88E] px-3 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178]"
                >
                  + Add group
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminTeamsPage() {
  return (
    <Suspense fallback={<p className="p-4 text-slate-500">Loading…</p>}>
      <TeamsInner />
    </Suspense>
  );
}
