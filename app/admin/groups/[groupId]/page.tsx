"use client";

import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { GroupSemicircle, type WallTile } from "@/components/admin/GroupSemicircle";
import { readResponseJson } from "@/lib/read-response-json";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type WallGroup = { id: number; name: string; teamId: number };

type WallSnapshotRow = {
  id: number;
  name: string;
  createdAt: string;
  displayCount: number;
  previewUrl: string | null;
  previewMediaKind: string;
  previewThemeColor: string;
};

export default function GroupWallPage() {
  const params = useParams();
  const groupId = Number(params.groupId as string);
  const [group, setGroup] = useState<WallGroup | null>(null);
  const [wallDisplays, setWallDisplays] = useState<WallTile[]>([]);
  const [wallScenes, setWallScenes] = useState<WallSnapshotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotPick, setSnapshotPick] = useState<string>("");
  const [massBusy, setMassBusy] = useState(false);
  const [massMsg, setMassMsg] = useState<string | null>(null);

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const saveDialogRef = useRef<HTMLDialogElement>(null);

  const [stripBusyId, setStripBusyId] = useState<number | null>(null);

  const loadGroup = useCallback(async () => {
    if (!Number.isFinite(groupId)) {
      setLoading(false);
      return;
    }
    const r = await fetch(`/api/groups/${groupId}/wall`, { credentials: "include" });
    const j = await readResponseJson<{ group: WallGroup; displays: WallTile[] }>(r);
    if (!r.ok || !j?.group) {
      setGroup(null);
      setWallDisplays([]);
      setLoading(false);
      return;
    }
    setGroup(j.group);
    setWallDisplays(Array.isArray(j.displays) ? j.displays : []);

    const wRes = await fetch(`/api/groups/${groupId}/wall-scenes`, { credentials: "include" });
    const wJson = await readResponseJson<{ snapshots?: WallSnapshotRow[] }>(wRes);
    setWallScenes(Array.isArray(wJson?.snapshots) ? wJson.snapshots : []);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    void loadGroup();
  }, [loadGroup]);

  useEffect(() => {
    const el = saveDialogRef.current;
    if (!el) return;
    if (saveOpen) el.showModal();
    else el.close();
  }, [saveOpen]);

  function openSaveDialog() {
    if (!group) return;
    setSaveMsg(null);
    setSaveTitle(`Wall · ${group.name}`);
    setSaveOpen(true);
  }

  async function submitSaveWallScene() {
    if (!group) return;
    const name = saveTitle.trim();
    if (!name) {
      setSaveMsg("Enter a title.");
      return;
    }
    setSaveBusy(true);
    setSaveMsg(null);
    const r = await fetch(`/api/groups/${groupId}/wall-scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });
    const data = await readResponseJson<{
      id?: number;
      displayCount?: number;
      error?: string;
    }>(r);
    setSaveBusy(false);
    if (!r.ok) {
      setSaveMsg(data?.error ?? "Could not save");
      return;
    }
    setSaveMsg(
      `Saved “${name}” — captured ${data?.displayCount ?? 0} paired screen(s). Push or Send to all to restore this layout.`
    );
    void loadGroup();
  }

  async function massApply() {
    const sid = Number(snapshotPick);
    if (!Number.isFinite(sid)) {
      setMassMsg("Pick a saved wall scene first.");
      return;
    }
    setMassBusy(true);
    setMassMsg(null);
    const r = await fetch(`/api/groups/${groupId}/broadcast-scene`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ wallSnapshotId: sid }),
    });
    const data = await readResponseJson<{ updated?: number; error?: string }>(r);
    setMassBusy(false);
    if (!r.ok) {
      setMassMsg(data?.error ?? "Could not apply");
      return;
    }
    setMassMsg(`Restored layout on ${data?.updated ?? 0} screen(s).`);
    void loadGroup();
  }

  async function massClear() {
    if (
      !confirm(
        "Clear live overrides and direct media on all paired screens in this group? They will follow schedule/default."
      )
    ) {
      return;
    }
    setMassBusy(true);
    setMassMsg(null);
    const r = await fetch(`/api/groups/${groupId}/broadcast-scene`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ clear: true }),
    });
    const data = await readResponseJson<{ updated?: number; error?: string }>(r);
    setMassBusy(false);
    if (!r.ok) {
      setMassMsg(data?.error ?? "Could not clear");
      return;
    }
    setMassMsg(`Cleared overrides on ${data?.updated ?? 0} screen(s).`);
    void loadGroup();
  }

  async function pushSnapshotToGroup(snapshotId: number) {
    setStripBusyId(snapshotId);
    const r = await fetch(`/api/groups/${groupId}/broadcast-scene`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ wallSnapshotId: snapshotId }),
    });
    const data = await readResponseJson<{ updated?: number; error?: string }>(r);
    setStripBusyId(null);
    if (!r.ok) {
      alert(data?.error ?? "Could not push");
      return;
    }
    setMassMsg(`Restored on ${data?.updated ?? 0} screen(s).`);
    void loadGroup();
  }

  async function deleteSnapshot(s: WallSnapshotRow) {
    if (!confirm(`Delete wall scene “${s.name}”?`)) return;
    setStripBusyId(s.id);
    const r = await fetch(`/api/groups/${groupId}/wall-scenes/${s.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    setStripBusyId(null);
    if (!r.ok) {
      alert("Could not delete");
      return;
    }
    void loadGroup();
  }

  if (!Number.isFinite(groupId)) {
    return <p className="text-red-600">Invalid group.</p>;
  }

  if (loading) {
    return <p className="text-slate-500">Loading…</p>;
  }

  if (!group) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">Group not found.</p>
        <Link href="/admin/groups" className="text-[#3d7d6c] underline">
          Back to groups
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminBreadcrumb
        items={[
          { label: "Dashboard", href: "/admin" },
          { label: "Groups", href: "/admin/groups" },
          { label: group.name },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900 md:text-3xl">
            {group.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            3D live wall — set each TV&apos;s content from display settings or Content → Send.{" "}
            <strong>Save as scene</strong> stores only a <strong>title</strong> and remembers what each paired
            screen is showing right now. <strong>Push</strong> or <strong>Send to all</strong> puts every
            screen back to that saved layout.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/displays"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Add screens
          </Link>
          <button
            type="button"
            onClick={() => openSaveDialog()}
            className="rounded-lg bg-[#52A88E] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178]"
          >
            Save as scene
          </button>
          <Link
            href="/admin/groups"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            All groups
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="font-gdl-display text-xs font-bold uppercase tracking-widest text-slate-500">
          Send to all screens in this group
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Choose a saved wall scene to <strong>restore each screen&apos;s captured content</strong> (direct
          media or scene override per TV). <strong>Clear</strong> removes overrides so TVs follow schedule /
          default.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[220px] flex-1">
            <label className="text-xs font-semibold text-slate-500">Wall scene</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={snapshotPick}
              onChange={(e) => setSnapshotPick(e.target.value)}
            >
              <option value="">
                {wallScenes.length === 0 ? "No wall scenes yet — save one above" : "Select wall scene…"}
              </option>
              {wallScenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.displayCount} screen{s.displayCount === 1 ? "" : "s"})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={massBusy || wallScenes.length === 0}
            onClick={() => void massApply()}
            className="rounded-lg bg-[#52A88E] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-50"
          >
            Send to all in group
          </button>
          <button
            type="button"
            disabled={massBusy}
            onClick={() => void massClear()}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            Clear overrides
          </button>
        </div>
        {massMsg ? <p className="mt-3 text-sm font-medium text-[#3d7d6c]">{massMsg}</p> : null}
      </section>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-100 to-slate-200/80 px-2 py-4 shadow-inner md:px-6">
        <GroupSemicircle groupId={groupId} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-gdl-display text-xs font-bold uppercase tracking-widest text-slate-500">
              Wall scenes (this group)
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Each card is a saved layout for <strong>{group.name}</strong>.{" "}
              <strong>Push</strong> restores every captured screen. Schedule graphics live under{" "}
              <Link href="/admin/scenes" className="font-semibold text-[#3d7d6c] underline">
                Scenes
              </Link>
              .
            </p>
          </div>
        </div>

        {wallScenes.length === 0 ? (
          <p className="mt-6 py-8 text-center text-sm text-slate-500">
            No wall scenes yet. Set up your TVs on the wall, then <strong>Save as scene</strong> with a title
            to capture each screen&apos;s current look.
          </p>
        ) : (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin]">
            {wallScenes.map((s) => (
              <div
                key={s.id}
                className="flex w-[min(200px,72vw)] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm"
              >
                <div className="relative aspect-video bg-black">
                  {s.previewUrl ? (
                    s.previewMediaKind === "VIDEO" ? (
                      <video
                        src={s.previewUrl}
                        className="h-full w-full object-contain object-center"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element -- preview URL */}
                        <img
                          src={s.previewUrl}
                          alt=""
                          className="absolute inset-0 z-0 h-full w-full object-contain object-center"
                        />
                        <div
                          className="pointer-events-none absolute inset-0 z-[1]"
                          style={{
                            background: `linear-gradient(145deg, ${s.previewThemeColor}55, transparent 45%)`,
                          }}
                        />
                      </>
                    )
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      No preview
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <p className="line-clamp-2 min-h-[2.5rem] text-xs font-bold text-slate-900">{s.name}</p>
                  <p className="text-[10px] text-slate-500">{s.displayCount} screen(s) captured</p>
                  <div className="mt-auto flex flex-col gap-1.5">
                    <button
                      type="button"
                      disabled={stripBusyId !== null}
                      onClick={() => void pushSnapshotToGroup(s.id)}
                      className="rounded-lg bg-[#52A88E] py-2 text-[11px] font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-50"
                    >
                      {stripBusyId === s.id ? "Pushing…" : "Push to TVs"}
                    </button>
                    <button
                      type="button"
                      disabled={stripBusyId !== null}
                      onClick={() => void deleteSnapshot(s)}
                      className="rounded-lg border border-red-200 py-2 text-[11px] font-bold uppercase tracking-wide text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <dialog
        ref={saveDialogRef}
        className="fixed left-1/2 top-1/2 z-[200] m-0 max-h-[min(90vh,900px)] w-[min(100%,440px)] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-black/50"
        onClose={() => setSaveOpen(false)}
      >
        <div className="max-h-[90vh] overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-gdl-display text-lg font-bold uppercase tracking-wide text-slate-900">
              Save as scene
            </h2>
            <button
              type="button"
              className="rounded p-1 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
              onClick={() => setSaveOpen(false)}
            >
              ×
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Enter a <strong>title</strong> only. We record what each <strong>paired</strong> screen in this
            group is showing now — including different direct media or scene overrides per TV. Pushing this
            scene later restores each screen to that saved state.
          </p>

          <label className="mt-4 block text-xs font-semibold text-slate-500">Title</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={saveTitle}
            onChange={(e) => setSaveTitle(e.target.value)}
            placeholder="e.g. Pregame wall"
          />

          <button
            type="button"
            disabled={saveBusy}
            onClick={() => void submitSaveWallScene()}
            className="mt-6 w-full rounded-lg bg-[#52A88E] py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-50"
          >
            {saveBusy ? "Saving…" : "Save wall scene"}
          </button>
          {saveMsg ? <p className="mt-3 text-sm text-[#3d7d6c]">{saveMsg}</p> : null}
        </div>
      </dialog>
    </div>
  );
}
