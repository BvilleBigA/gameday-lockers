"use client";

import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { readResponseJson } from "@/lib/read-response-json";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

type Display = {
  id: number;
  label: string | null;
  teamId: number | null;
  groupId: number | null;
  overrideSceneId: number | null;
  directMediaUrl: string | null;
  directMediaKind: string | null;
  directThemeColor: string | null;
  isPaired: boolean;
  group: { id: number; name: string } | null;
  overrideScene: { id: number; name: string } | null;
};

type Group = { id: number; name: string };
type Scene = { id: number; name: string };

function DisplaySettingsInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromGroup = searchParams.get("fromGroup");
  const id = Number(params.id as string);

  const [display, setDisplay] = useState<Display | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [overrideSceneId, setOverrideSceneId] = useState<string>("");
  const [directMediaUrl, setDirectMediaUrl] = useState("");
  const [directMediaKind, setDirectMediaKind] = useState<"IMAGE" | "VIDEO" | "URL">("IMAGE");
  const [directThemeColor, setDirectThemeColor] = useState("#1e293b");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(id)) {
      setLoading(false);
      return;
    }
    const dRes = await fetch(`/api/displays/${id}`, { credentials: "include" });
    if (!dRes.ok) {
      setDisplay(null);
      setLoading(false);
      return;
    }
    const d = await readResponseJson<Display>(dRes);
    if (!d || typeof d !== "object" || !("id" in d)) {
      setDisplay(null);
      setLoading(false);
      return;
    }
    setDisplay(d);
    setLabel(d.label ?? "");
    setGroupId(d.groupId != null ? String(d.groupId) : "");
    setOverrideSceneId(d.overrideSceneId != null ? String(d.overrideSceneId) : "");
    const hasDirect = Boolean(d.directMediaUrl?.trim());
    setDirectMediaUrl(hasDirect ? (d.directMediaUrl ?? "") : "");
    setDirectMediaKind(
      hasDirect && d.directMediaKind === "VIDEO"
        ? "VIDEO"
        : hasDirect && d.directMediaKind === "URL"
          ? "URL"
          : "IMAGE"
    );
    setDirectThemeColor(
      hasDirect && d.directThemeColor?.trim() ? d.directThemeColor : "#1e293b"
    );
    if (hasDirect) {
      setOverrideSceneId("");
    }

    const [gRes, sRes] = await Promise.all([
      fetch("/api/groups", { credentials: "include" }),
      fetch(
        d.teamId != null ? `/api/scenes?teamId=${d.teamId}` : "/api/scenes",
        { credentials: "include" }
      ),
    ]);
    const gJson = await readResponseJson<unknown>(gRes);
    const sJson = await readResponseJson<unknown>(sRes);
    setGroups(Array.isArray(gJson) ? (gJson as Group[]) : []);
    setScenes(Array.isArray(sJson) ? (sJson as Scene[]) : []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const body: Record<string, unknown> = {
      label: label.trim() || null,
      groupId: groupId === "" ? null : Number(groupId),
      overrideSceneId: overrideSceneId === "" ? null : Number(overrideSceneId),
      directMediaUrl: directMediaUrl.trim(),
      directMediaKind,
      directThemeColor,
    };
    const r = await fetch(`/api/displays/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      setMsg((err as { error?: string }).error ?? "Could not save");
      return;
    }
    setMsg("Saved.");
    void load();
    window.setTimeout(() => setMsg(null), 2500);
  }

  async function removeFromSystem() {
    if (!confirm("Remove this screen? It can pair again from /screen.")) return;
    await fetch(`/api/displays/${id}/reset`, { method: "POST" });
    router.push("/admin/displays");
  }

  if (!Number.isFinite(id)) {
    return <p className="text-red-600">Invalid display.</p>;
  }

  if (loading) {
    return <p className="text-slate-500">Loading…</p>;
  }

  if (!display) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">Display not found.</p>
        <Link href="/admin/displays" className="text-[#3d7d6c] underline">
          Back to screens list
        </Link>
      </div>
    );
  }

  const wallHref =
    fromGroup && Number.isFinite(Number(fromGroup))
      ? `/admin/groups/${fromGroup}`
      : display.groupId != null
        ? `/admin/groups/${display.groupId}`
        : "/admin/groups";

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <AdminBreadcrumb
        items={[
          { label: "Dashboard", href: "/admin" },
          { label: "Groups", href: "/admin/groups" },
          ...(display.group
            ? [{ label: display.group.name, href: `/admin/groups/${display.group.id}` }]
            : []),
          { label: display.label ?? `Display ${display.id}` },
        ]}
      />

      <div>
        <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900">
          Display settings
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          ID {display.id} · {display.isPaired ? "Paired" : "Not paired"}
        </p>
      </div>

      <form onSubmit={save} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Label</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Group</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">— None —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Assigns this display to a group wall and syncs facility scope for schedules.
          </p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50/90 p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Direct media (no scene)</p>
          <p className="mt-1 text-xs text-slate-600">
            Each screen can show its own URL. Direct media overrides a scene for this display only. Leave
            empty to use a scene or schedule below.
          </p>
          <label className="mt-3 block text-xs font-semibold text-slate-500">Media URL</label>
          <textarea
            className="mt-1 min-h-[64px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs"
            value={directMediaUrl}
            onChange={(e) => {
              setDirectMediaUrl(e.target.value);
              if (e.target.value.trim()) setOverrideSceneId("");
            }}
            placeholder="https://…"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-500">Type</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                value={directMediaKind}
                onChange={(e) =>
                  setDirectMediaKind(e.target.value as "IMAGE" | "VIDEO" | "URL")
                }
              >
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
                <option value="URL">URL</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500">Theme / tint</label>
              <input
                type="color"
                className="mt-1 h-10 w-full cursor-pointer rounded border border-slate-200 bg-white"
                value={directThemeColor}
                onChange={(e) => setDirectThemeColor(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Live override scene</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={overrideSceneId}
            onChange={(e) => {
              setOverrideSceneId(e.target.value);
              if (e.target.value) {
                setDirectMediaUrl("");
              }
            }}
          >
            <option value="">— Follow schedule / default —</option>
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            When you edit that scene&apos;s media in the scene editor, every screen using it updates on the
            next refresh. Use <strong>Send to all in group</strong> on the group wall to assign the same
            scene to every screen in a group at once.
          </p>
        </div>
        {msg ? (
          <p className={`text-sm font-medium ${msg === "Saved." ? "text-[#3d7d6c]" : "text-red-600"}`}>
            {msg}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#52A88E] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <Link
            href={wallHref}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            View group wall
          </Link>
        </div>
      </form>

      <button
        type="button"
        onClick={() => void removeFromSystem()}
        className="w-full rounded-lg border-2 border-red-200 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        Remove screen from system
      </button>
    </div>
  );
}

export default function DisplaySettingsPage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
      <DisplaySettingsInner />
    </Suspense>
  );
}
