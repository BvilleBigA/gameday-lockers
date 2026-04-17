"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

type Team = { id: number; name: string };
type Group = { id: number; name: string; teamId: number };
type Player = {
  id: number;
  firstName: string;
  lastName: string;
  number: string;
  position: string;
  imageUrl: string | null;
  teamId: number;
  groupId: number;
  team: Team;
  group: Group;
};

export default function AdminRosterPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    number: "",
    position: "",
    imageUrl: "",
    teamId: "",
    groupId: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadPlayers = useCallback(async () => {
    const r = await fetch("/api/players");
    setPlayers(await r.json());
  }, []);

  const loadTeams = useCallback(async () => {
    const r = await fetch("/api/teams");
    const data: { id: number; name: string }[] = await r.json();
    setTeams(data);
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([loadPlayers(), loadTeams()]);
      setLoading(false);
    })();
  }, [loadPlayers, loadTeams]);

  useEffect(() => {
    const tid = Number(form.teamId);
    if (!Number.isFinite(tid)) {
      setGroups([]);
      return;
    }
    (async () => {
      const r = await fetch(`/api/groups?teamId=${tid}`);
      setGroups(await r.json());
    })();
  }, [form.teamId]);

  async function createPlayer(e: React.FormEvent) {
    e.preventDefault();
    const teamId = Number(form.teamId);
    const groupId = Number(form.groupId);
    if (!form.firstName.trim() || !form.lastName.trim() || !form.teamId || !form.groupId) {
      return;
    }
    await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        number: form.number.trim() || "—",
        position: form.position.trim() || "—",
        imageUrl: form.imageUrl.trim() || null,
        teamId,
        groupId,
      }),
    });
    setForm({
      firstName: "",
      lastName: "",
      number: "",
      position: "",
      imageUrl: "",
      teamId: "",
      groupId: "",
    });
    loadPlayers();
  }

  async function deletePlayer(id: number) {
    if (!confirm("Remove this player?")) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    loadPlayers();
  }

  if (loading) {
    return <p className="text-slate-500">Loading roster…</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Roster</h1>
        <p className="mt-1 text-sm text-slate-600">Players, assignments, and headshots.</p>
      </div>

      <form
        onSubmit={createPlayer}
        className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
      >
        <Field
          label="First name"
          value={form.firstName}
          onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
        />
        <Field
          label="Last name"
          value={form.lastName}
          onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
        />
        <Field
          label="Number"
          value={form.number}
          onChange={(v) => setForm((f) => ({ ...f, number: v }))}
        />
        <Field
          label="Position"
          value={form.position}
          onChange={(v) => setForm((f) => ({ ...f, position: v }))}
        />
        <div className="sm:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Image URL
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="https://…"
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Team</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.teamId}
            onChange={(e) =>
              setForm((f) => ({ ...f, teamId: e.target.value, groupId: "" }))
            }
          >
            <option value="">Select team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Group</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={form.groupId}
            onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}
            disabled={!form.teamId}
          >
            <option value="">Select group</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Add player
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Pos</th>
              <th className="px-4 py-3">Team / group</th>
              <th className="px-4 py-3 w-28" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {players.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-slate-200">
                      {p.imageUrl ? (
                        <Image
                          src={p.imageUrl}
                          alt=""
                          fill
                          className="object-contain"
                          sizes="40px"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <span className="font-medium text-slate-900">
                      {p.firstName} {p.lastName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-700">{p.number}</td>
                <td className="px-4 py-3 text-slate-700">{p.position}</td>
                <td className="px-4 py-3 text-slate-600">
                  {p.team.name} · {p.group.name}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setEditingId(p.id)}
                    className="mr-2 text-slate-600 hover:text-slate-900"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deletePlayer(p.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId !== null && players.find((x) => x.id === editingId) && (
        <EditPlayerModal
          player={players.find((x) => x.id === editingId) as Player}
          teams={teams}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            loadPlayers();
          }}
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</label>
      <input
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function EditPlayerModal({
  player,
  teams,
  onClose,
  onSaved,
}: {
  player: Player;
  teams: Team[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    firstName: player.firstName,
    lastName: player.lastName,
    number: player.number,
    position: player.position,
    imageUrl: player.imageUrl ?? "",
    teamId: String(player.teamId),
    groupId: String(player.groupId),
  });
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    const tid = Number(form.teamId);
    if (!Number.isFinite(tid)) return;
    (async () => {
      const r = await fetch(`/api/groups?teamId=${tid}`);
      setGroups(await r.json());
    })();
  }, [form.teamId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`/api/players/${player.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        number: form.number.trim(),
        position: form.position.trim(),
        imageUrl: form.imageUrl.trim() || null,
        teamId: Number(form.teamId),
        groupId: Number(form.groupId),
      }),
    });
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Edit player</h2>
        <form onSubmit={save} className="mt-4 grid gap-3">
          <Field
            label="First name"
            value={form.firstName}
            onChange={(v) => setForm((f) => ({ ...f, firstName: v }))}
          />
          <Field
            label="Last name"
            value={form.lastName}
            onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}
          />
          <Field
            label="Number"
            value={form.number}
            onChange={(v) => setForm((f) => ({ ...f, number: v }))}
          />
          <Field
            label="Position"
            value={form.position}
            onChange={(v) => setForm((f) => ({ ...f, position: v }))}
          />
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Image URL
            </label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Team</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.teamId}
              onChange={(e) =>
                setForm((f) => ({ ...f, teamId: e.target.value, groupId: "" }))
              }
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Group</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={form.groupId}
              onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value }))}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
