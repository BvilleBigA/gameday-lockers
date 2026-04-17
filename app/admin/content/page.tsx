"use client";

import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { readResponseJson } from "@/lib/read-response-json";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type FolderRow = {
  id: number;
  name: string;
  groupId: number | null;
  _count: { children: number; assets: number };
};

type AssetRow = {
  id: number;
  name: string;
  url: string;
  mediaKind: string;
};

type Crumb = { id: number | null; name: string };

type DisplayOpt = {
  id: number;
  label: string | null;
  isPaired: boolean;
  group?: { name: string; contentFolder?: { id: number } | null } | null;
};

export default function AdminContentPage() {
  const [parentId, setParentId] = useState<number | null>(null);
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: "Library" }]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);

  const [selected, setSelected] = useState<AssetRow | null>(null);
  const [editName, setEditName] = useState("");
  const [displays, setDisplays] = useState<DisplayOpt[]>([]);
  const [displayPick, setDisplayPick] = useState<string>("");
  const [modalBusy, setModalBusy] = useState(false);
  const [modalMsg, setModalMsg] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const load = useCallback(async () => {
    const url =
      parentId == null ? "/api/content" : `/api/content?parentId=${encodeURIComponent(String(parentId))}`;
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) {
      setLoading(false);
      return;
    }
    const j = (await r.json()) as { folders: FolderRow[]; assets: AssetRow[] };
    setFolders(j.folders ?? []);
    setAssets(j.assets ?? []);
    setLoading(false);
  }, [parentId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (selected) {
      setEditName(selected.name);
      setModalMsg(null);
      setDisplayPick("");
      el.showModal();
    } else {
      el.close();
    }
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    void (async () => {
      const dRes = await fetch("/api/displays", { credentials: "include" });
      const dJson = await readResponseJson<DisplayOpt[]>(dRes);
      const dList = Array.isArray(dJson) ? dJson : [];
      setDisplays(dList.filter((d) => d.isPaired));
    })();
  }, [selected]);

  function enterFolder(f: FolderRow) {
    setParentId(f.id);
    setCrumbs((c) => [...c, { id: f.id, name: f.name }]);
  }

  function goCrumb(index: number) {
    const slice = crumbs.slice(0, index + 1);
    setCrumbs(slice);
    const last = slice[slice.length - 1];
    setParentId(last?.id ?? null);
  }

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    await fetch("/api/content/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name,
        parentId: parentId ?? undefined,
      }),
    });
    setNewFolderName("");
    void load();
  }

  async function deleteFolder(id: number) {
    if (!confirm("Delete this folder and everything inside?")) return;
    await fetch(`/api/content/folders/${id}`, { method: "DELETE", credentials: "include" });
    if (parentId === id) {
      goCrumb(0);
    } else {
      void load();
    }
  }

  async function deleteAsset(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Remove this file from the library?")) return;
    await fetch(`/api/content/assets/${id}`, { method: "DELETE", credentials: "include" });
    if (selected?.id === id) setSelected(null);
    void load();
  }

  async function uploadFile(file: File) {
    setUploadBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const up = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
    const data = await readResponseJson<{ url?: string; mediaKind?: string; error?: string }>(up);
    setUploadBusy(false);
    if (!up.ok) {
      alert(data?.error ?? "Upload failed");
      return;
    }
    const url = data?.url;
    const mediaKind = data?.mediaKind;
    if (!url || !mediaKind) {
      alert("Upload response incomplete");
      return;
    }
    await fetch("/api/content/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        url,
        name: file.name,
        mediaKind,
        folderId: parentId ?? undefined,
      }),
    });
    void load();
  }

  async function saveRename() {
    if (!selected) return;
    const name = editName.trim();
    if (!name) {
      setModalMsg("Name is required.");
      return;
    }
    setModalBusy(true);
    setModalMsg(null);
    const r = await fetch(`/api/content/assets/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });
    setModalBusy(false);
    if (!r.ok) {
      const err = await readResponseJson<{ error?: string }>(r);
      setModalMsg(err?.error ?? "Could not rename");
      return;
    }
    setSelected((s) => (s ? { ...s, name } : null));
    void load();
    setModalMsg("Renamed.");
  }

  function assetMediaKindForApi(): "IMAGE" | "VIDEO" | "URL" {
    if (!selected) return "IMAGE";
    const k = selected.mediaKind?.toUpperCase();
    if (k === "VIDEO") return "VIDEO";
    if (k === "URL") return "URL";
    return "IMAGE";
  }

  async function sendToScreen() {
    if (!selected) return;
    const did = Number(displayPick);
    if (!Number.isFinite(did)) {
      setModalMsg("Choose a paired screen.");
      return;
    }
    setModalBusy(true);
    setModalMsg(null);
    const mk = assetMediaKindForApi();
    const pr = await fetch(`/api/displays/${did}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        directMediaUrl: selected.url,
        directMediaKind: mk,
        directThemeColor: "#1e293b",
        overrideSceneId: null,
      }),
    });
    const updatedDisplay = await readResponseJson<{
      error?: string;
      group?: { contentFolder?: { id: number } | null } | null;
    }>(pr);
    setModalBusy(false);
    if (!pr.ok) {
      setModalMsg(updatedDisplay?.error ?? "Could not send to screen");
      return;
    }
    const groupFolderId = updatedDisplay?.group?.contentFolder?.id;
    if (groupFolderId != null) {
      const mv = await fetch(`/api/content/assets/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ folderId: groupFolderId }),
      });
      if (!mv.ok) {
        setModalMsg("Sent to screen, but file could not be moved into the group folder.");
        void load();
        return;
      }
    }
    setModalMsg(
      groupFolderId != null
        ? "Sent. File moved to the group’s content folder when possible."
        : "Sent to screen."
    );
    void load();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminBreadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Content" }]} />

      <div>
        <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900 md:text-4xl">
          Content library
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Upload images and videos, organize them in folders like a file explorer. Each{" "}
          <strong>screen group</strong> has a matching folder at the library root (created when you add the
          group). Open a file to <strong>rename</strong> it or <strong>send</strong> it to a paired screen.
        </p>
      </div>

      <nav className="flex flex-wrap items-center gap-1 text-sm text-slate-600">
        {crumbs.map((c, i) => (
          <span key={`${c.id ?? "root"}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <span className="text-slate-400">/</span> : null}
            <button
              type="button"
              onClick={() => goCrumb(i)}
              className={`rounded px-1 font-medium hover:text-[#3d7d6c] ${
                i === crumbs.length - 1 ? "text-slate-900" : ""
              }`}
            >
              {c.name}
            </button>
          </span>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(200px,260px)_1fr]">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-gdl-display text-xs font-bold uppercase tracking-widest text-slate-500">
            Folders
          </h2>
          {parentId !== null ? (
            <button
              type="button"
              onClick={() => goCrumb(crumbs.length - 2)}
              className="w-full rounded-lg border border-slate-200 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              ↑ Up
            </button>
          ) : null}
          <ul className="space-y-1">
            {folders.map((f) => (
              <li key={f.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => enterFolder(f)}
                  className="min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-800 hover:bg-[#52A88E]/15"
                >
                  <span className="mr-1">📁</span>
                  {f.name}
                  {f.groupId != null ? (
                    <span className="ml-2 inline-block rounded bg-[#52A88E]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3d7d6c]">
                      Group
                    </span>
                  ) : null}
                </button>
                {f.groupId != null ? (
                  <Link
                    href={`/admin/groups/${f.groupId}`}
                    className="shrink-0 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#3d7d6c] hover:underline"
                  >
                    Wall
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => void deleteFolder(f.id)}
                    className="shrink-0 rounded p-1 text-xs text-red-500 hover:bg-red-50"
                    aria-label={`Delete ${f.name}`}
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
          <form onSubmit={createFolder} className="border-t border-slate-100 pt-3">
            <input
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              placeholder="New folder"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-slate-800 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-slate-900"
            >
              Add folder
            </button>
          </form>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-gdl-display text-xs font-bold uppercase tracking-widest text-slate-500">
              Files
            </h2>
            <label className="cursor-pointer rounded-lg bg-[#52A88E] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-50">
              {uploadBusy ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                className="sr-only"
                disabled={uploadBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void uploadFile(f);
                }}
              />
            </label>
          </div>

          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : assets.length === 0 && folders.length === 0 ? (
            <p className="py-12 text-center text-slate-500">This folder is empty. Upload or add a subfolder.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {assets.map((a) => (
                <li
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(a)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(a);
                    }
                  }}
                  className="cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm outline-none ring-[#52A88E] transition hover:border-[#52A88E]/50 focus-visible:ring-2"
                >
                  <div className="aspect-video bg-black">
                    {a.mediaKind === "VIDEO" ? (
                      <video
                        src={a.url}
                        className="h-full w-full object-contain object-center"
                        muted
                        playsInline
                        controls
                      />
                    ) : (
                      <img src={a.url} alt="" className="h-full w-full object-contain object-center" />
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2 p-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-900">{a.name}</p>
                      <p className="mt-1 text-[10px] text-slate-500">Click to rename or send to a screen.</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => void deleteAsset(a.id, e)}
                      className="shrink-0 text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 z-[200] m-0 max-h-[min(90vh,900px)] w-[min(100%,480px)] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-0 shadow-2xl backdrop:bg-black/50"
        onClose={() => setSelected(null)}
      >
        {selected ? (
          <div className="max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-gdl-display text-lg font-bold uppercase tracking-wide text-slate-900">
                Media
              </h2>
              <button
                type="button"
                className="rounded p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>
            <div className="mt-3 aspect-video overflow-hidden rounded-lg bg-black">
              {selected.mediaKind === "VIDEO" ? (
                <video src={selected.url} className="h-full w-full object-contain" controls playsInline />
              ) : (
                <img src={selected.url} alt="" className="h-full w-full object-contain" />
              )}
            </div>

            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Rename</p>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <button
                type="button"
                disabled={modalBusy}
                onClick={() => void saveRename()}
                className="w-full rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                Rename
              </button>
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Send</p>
              <label className="block text-xs text-slate-600">Screen</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={displayPick}
                onChange={(e) => setDisplayPick(e.target.value)}
              >
                <option value="">Select paired screen…</option>
                {displays.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label ?? `Screen ${d.id}`}
                    {d.group?.name ? ` · ${d.group.name}` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={modalBusy}
                onClick={() => void sendToScreen()}
                className="w-full rounded-lg bg-[#52A88E] py-2.5 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-50"
              >
                Send
              </button>
            </div>

            {modalMsg ? <p className="mt-4 text-sm text-[#3d7d6c]">{modalMsg}</p> : null}
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
