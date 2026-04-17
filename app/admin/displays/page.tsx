"use client";

import { AdminBrandRibbon } from "@/components/admin/AdminBrandRibbon";
import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { RowActionsMenu } from "@/components/admin/RowActionsMenu";
import { SelectMenu } from "@/components/admin/SelectMenu";
import { readResponseJson } from "@/lib/read-response-json";
import { normalizePairingCode } from "@/lib/pairing-code";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Group = { id: number; name: string };
type Scene = { id: number; name: string };
type Display = {
  id: number;
  pairingCode: string;
  label: string | null;
  isPaired: boolean;
  teamId: number | null;
  groupId: number | null;
  group: Group | null;
  overrideSceneId: number | null;
  overrideScene: Scene | null;
};

function DisplaysContent() {
  const searchParams = useSearchParams();
  const [displays, setDisplays] = useState<Display[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [codesText, setCodesText] = useState("");
  const [namePrefix, setNamePrefix] = useState("Screen");
  const [startNumber, setStartNumber] = useState(1);
  const [regGroupId, setRegGroupId] = useState("");
  const [regBusy, setRegBusy] = useState(false);
  const [regMsg, setRegMsg] = useState<string | null>(null);
  const [regDetail, setRegDetail] = useState<string | null>(null);
  const [showAddScreensModal, setShowAddScreensModal] = useState(false);

  const load = useCallback(async () => {
    const [dRes, gRes] = await Promise.all([
      fetch("/api/displays", { credentials: "include" }),
      fetch("/api/groups", { credentials: "include" }),
    ]);
    const dJson = await readResponseJson<unknown>(dRes);
    const gJson = await readResponseJson<unknown>(gRes);
    setDisplays(Array.isArray(dJson) ? (dJson as Display[]) : []);
    setGroups(Array.isArray(gJson) ? (gJson as Group[]) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const q = searchParams.get("code");
    if (!q) return;
    const n = normalizePairingCode(q);
    if (n) {
      setCodesText((prev) => (prev.trim() ? prev : n));
      setShowAddScreensModal(true);
    }
  }, [searchParams]);

  async function addScreens(e: React.FormEvent) {
    e.preventDefault();
    setRegMsg(null);
    setRegDetail(null);
    const gid = Number(regGroupId);
    if (!Number.isFinite(gid)) {
      setRegMsg("Select a group.");
      return;
    }
    if (!codesText.trim()) {
      setRegMsg("Paste at least one registration code from a screen.");
      return;
    }
    setRegBusy(true);
    const r = await fetch("/api/displays/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codes: codesText,
        groupId: gid,
        namePrefix: namePrefix.trim() || "Screen",
        startNumber,
      }),
    });
    const data = await r.json().catch(() => ({}));
    setRegBusy(false);
    if (!r.ok) {
      setRegMsg(data.error ?? "Could not add screens");
      if (data.errors?.length) {
        setRegDetail(
          data.errors.map((x: { code: string; error: string }) => `${x.code}: ${x.error}`).join("\n")
        );
      }
      return;
    }
    const n = data.created?.length ?? 0;
    setRegMsg(`Added ${n} screen${n === 1 ? "" : "s"}.`);
    if (data.errors?.length) {
      setRegDetail(
        data.errors.map((x: { code: string; error: string }) => `${x.code}: ${x.error}`).join("\n")
      );
    }
    setCodesText("");
    load();
    setShowAddScreensModal(false);
    window.setTimeout(() => {
      setRegMsg(null);
      setRegDetail(null);
    }, 8000);
  }

  async function removeDisplay(id: number) {
    if (!confirm("Remove this screen from the system? The device can generate a new code on /screen.")) {
      return;
    }
    await fetch(`/api/displays/${id}/reset`, { method: "POST" });
    load();
  }

  const groupOptions = [
    { value: "", label: "Select group…" },
    ...groups.map((g) => ({ value: String(g.id), label: g.name })),
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <AdminBreadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Screens" }]} />

      <div>
        <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900 md:text-3xl">
          Screens & pairing
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
          Codes from TVs are <strong className="font-semibold text-slate-800">not stored</strong> until you
          register them here. Each screen joins a <strong className="font-semibold text-slate-800">group</strong>{" "}
          so it appears on the correct 3D wall.{" "}
          <Link href="/admin/groups" className="font-semibold text-[#3d7d6c] underline decoration-[#52A88E]/40 underline-offset-2 hover:text-[#52A88E]">
            Manage groups
          </Link>
          .
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowAddScreensModal(true)}
            className="rounded-xl bg-[#52A88E] px-7 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-[#52A88E]/25 transition hover:bg-[#469178]"
          >
            Add screens
          </button>
        </div>
      </div>

      {showAddScreensModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-black/[0.05]">
            <AdminBrandRibbon
              title="Add screens"
              description="Paste one or more pairing codes from /screen, choose the group and naming, then register."
            />
            <div className="px-5 py-6 sm:px-7 sm:py-8">
              <form onSubmit={addScreens} className="space-y-6">
                <div>
                  <label htmlFor="reg-codes" className="text-sm font-medium text-slate-700">
                    Registration codes
                  </label>
                  <textarea
                    id="reg-codes"
                    value={codesText}
                    onChange={(e) => setCodesText(e.target.value)}
                    spellCheck={false}
                    className="mt-2 min-h-[132px] w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#52A88E] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#52A88E]/20"
                    placeholder="A2J4-F5E1"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Separate codes with spaces, commas, or new lines.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                  <SelectMenu
                    label="Group"
                    value={regGroupId}
                    onChange={setRegGroupId}
                    options={groupOptions}
                    hint="Wall assignment for every code in this batch."
                  />
                  <div className="grid gap-2">
                    <label htmlFor="name-prefix" className="text-sm font-medium text-slate-700">
                      Name prefix
                    </label>
                    <input
                      id="name-prefix"
                      value={namePrefix}
                      onChange={(e) => setNamePrefix(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#52A88E] focus:ring-2 focus:ring-[#52A88E]/20"
                      placeholder="Screen"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="start-num" className="text-sm font-medium text-slate-700">
                      Start number
                    </label>
                    <input
                      id="start-num"
                      type="number"
                      min={1}
                      value={startNumber}
                      onChange={(e) => setStartNumber(Number(e.target.value) || 1)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#52A88E] focus:ring-2 focus:ring-[#52A88E]/20"
                    />
                  </div>
                </div>

                {regMsg ? (
                  <div
                    role="status"
                    className={`rounded-xl border px-4 py-3 text-sm font-medium ${
                      regDetail
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-[#52A88E]/30 bg-[#f0faf7] text-[#2d6b5a]"
                    }`}
                  >
                    {regMsg}
                  </div>
                ) : null}
                {regDetail ? (
                  <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs text-slate-600">
                    {regDetail}
                  </pre>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={regBusy}
                    className="rounded-xl bg-[#52A88E] px-7 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-[#52A88E]/25 transition hover:bg-[#469178] disabled:opacity-50"
                  >
                    {regBusy ? "Adding…" : "Add screens"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddScreensModal(false)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <Link
                    href="/screen"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    Open /screen on a TV
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="font-gdl-display text-lg font-bold uppercase tracking-wide text-slate-800">
          Registered screens
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Pairing codes stay on the device; this list is your registered displays.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-black/[0.03]">
        <div className="divide-y divide-slate-100">
          {displays.map((d) => (
            <div
              key={d.id}
              className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/displays/${d.id}`}
                  className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#52A88E]/40"
                >
                  <p className="text-lg font-semibold text-slate-900 group-hover:text-[#3d7d6c]">
                    {d.label ?? `Display ${d.id}`}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    ID {d.id}
                    <span className="text-slate-400"> · </span>
                    <span className="font-medium text-[#3d7d6c]">Settings</span>
                  </p>
                </Link>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                  {d.group ? (
                    <span>
                      <span className="text-slate-400">Group</span> {d.group.name}
                    </span>
                  ) : null}
                  {d.overrideScene ? (
                    <span className="text-[#3d7d6c]">Override: {d.overrideScene.name}</span>
                  ) : null}
                </div>
              </div>
              <RowActionsMenu
                ariaLabel={`Actions for ${d.label ?? `display ${d.id}`}`}
                items={[
                  { type: "link", label: "Open settings", href: `/admin/displays/${d.id}` },
                  {
                    type: "button",
                    label: "Remove screen…",
                    danger: true,
                    onClick: () => void removeDisplay(d.id),
                  },
                ]}
              />
            </div>
          ))}
        </div>
        {displays.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-gdl-display text-sm font-semibold uppercase tracking-wide text-slate-500">
              No screens yet
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
              Open{" "}
              <Link href="/screen" className="font-semibold text-[#3d7d6c] underline">
                /screen
              </Link>{" "}
              on a display, then paste the code in the form above.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AdminDisplaysPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      }
    >
      <DisplaysContent />
    </Suspense>
  );
}
