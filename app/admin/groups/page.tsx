"use client";

import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { readResponseJson } from "@/lib/read-response-json";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Group = { id: number; name: string; _count?: { displays: number } };

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/groups", { credentials: "include" });
    const data = await readResponseJson<unknown>(r);
    setGroups(Array.isArray(data) ? (data as Group[]) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (modalOpen) {
      setNewName("");
      el.showModal();
    } else {
      el.close();
    }
  }, [modalOpen]);

  async function addGroup(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    const r = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!r.ok) {
      const err = await readResponseJson<{ error?: string }>(r);
      alert(err?.error ?? "Could not create group");
      return;
    }
    setModalOpen(false);
    setNewName("");
    void load();
  }

  async function deleteGroup(id: number, name: string) {
    if (!confirm(`Delete group “${name}”? Its content folder and displays’ group assignment are affected.`)) {
      return;
    }
    const r = await fetch(`/api/groups/${id}`, { method: "DELETE", credentials: "include" });
    if (!r.ok) {
      alert(
        "Could not delete this group. If roster players are still assigned to it, move them in Roster first."
      );
      return;
    }
    void load();
  }

  if (loading) {
    return <p className="text-slate-500">Loading groups…</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <AdminBreadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Groups" }]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900 md:text-4xl">
            Groups
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Each group gets a matching folder under <strong>Content</strong> for media. Open a group to
            see the 3D live wall, save titled wall scenes (per-screen layout), and send them to all TVs at once.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[#52A88E] px-5 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178]"
          >
            Add group
          </button>
          <Link
            href="/admin/displays"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold uppercase tracking-wide text-slate-800 hover:bg-slate-50"
          >
            Screens (codes)
          </Link>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 z-[200] m-0 max-h-[min(90vh,900px)] w-[min(100%,420px)] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-black/50"
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={addGroup} className="p-6">
          <h2 className="font-gdl-display text-lg font-bold uppercase tracking-wide text-slate-900">
            New screen group
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            A content library folder with the same name will be created automatically.
          </p>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Group name
          </label>
          <input
            autoFocus
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="e.g. East lockers"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="rounded-lg bg-[#52A88E] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </dialog>

      <div>
        <h2 className="font-gdl-display text-sm font-bold uppercase tracking-widest text-slate-500">
          All groups
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.length === 0 ? (
            <p className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 py-12 text-center text-slate-600">
              No groups yet. Use <span className="font-semibold text-[#3d7d6c]">Add group</span>, then
              register screens under <Link href="/admin/displays" className="font-semibold underline">Screens</Link>.
            </p>
          ) : (
            groups.map((g) => (
              <div
                key={g.id}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 shadow-md transition hover:border-[#52A88E]/50 hover:shadow-lg"
              >
                <Link href={`/admin/groups/${g.id}`} className="block p-6 text-white">
                  <p className="font-gdl-display text-xl font-bold uppercase tracking-wide md:text-2xl">
                    {g.name}
                  </p>
                  <p className="mt-3 text-sm text-slate-400">
                    {g._count?.displays ?? 0} screen{(g._count?.displays ?? 0) === 1 ? "" : "s"}
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-[#7dccb4] opacity-0 transition group-hover:opacity-100">
                    Open wall & mass send →
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => void deleteGroup(g.id, g.name)}
                  className="absolute right-3 top-3 rounded-md bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-300 backdrop-blur hover:bg-red-950/80 hover:text-white"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
