"use client";

import { SceneScreenView } from "@/components/scene/SceneScreenView";
import {
  defaultLayoutForTemplate,
  type LayerKey,
  type LayoutTemplateId,
  type SceneLayoutState,
  type SceneTextLayer,
  serializeSceneLayout,
  TEMPLATE_IDS,
  TEMPLATE_META,
  parseSceneLayout,
} from "@/lib/scene-layout";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Team = { id: number; name: string };

type SceneRow = {
  id: number;
  name: string;
  teamId: number | null;
  backgroundUrl: string;
  themeColor: string;
  mediaKind: string;
  layoutJson: string;
};

type Props = {
  scene: SceneRow;
  teams: Team[];
  teamIdQs: string | null;
  onSaved: () => void;
};

function clamp(n: number, a: number, b: number) {
  return Math.min(b, Math.max(a, n));
}

function applyTemplateKeepCopy(
  templateId: LayoutTemplateId,
  prev: SceneLayoutState,
  sceneName: string
): SceneLayoutState {
  const base = defaultLayoutForTemplate(templateId, sceneName);
  return {
    ...base,
    headline: { ...base.headline, content: prev.headline.content || base.headline.content },
    subhead: { ...base.subhead, content: prev.subhead.content },
    tagline: { ...base.tagline, content: prev.tagline.content },
  };
}

export function SceneGraphicEditor({ scene, teams, teamIdQs, onSaved }: Props) {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(scene.name);
  const [teamId, setTeamId] = useState(scene.teamId ? String(scene.teamId) : "");
  const [backgroundUrl, setBackgroundUrl] = useState(scene.backgroundUrl);
  const [themeColor, setThemeColor] = useState(scene.themeColor);
  const [mediaKind, setMediaKind] = useState(scene.mediaKind || "URL");
  const [layout, setLayout] = useState<SceneLayoutState>(() =>
    parseSceneLayout(scene.layoutJson ?? "{}", scene.name)
  );
  const [selectedLayer, setSelectedLayer] = useState<LayerKey | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLayout(parseSceneLayout(scene.layoutJson ?? "{}", scene.name));
    setName(scene.name);
    setTeamId(scene.teamId ? String(scene.teamId) : "");
    setBackgroundUrl(scene.backgroundUrl);
    setThemeColor(scene.themeColor);
    setMediaKind(scene.mediaKind || "URL");
    setDirty(false);
  }, [scene]);

  const markDirty = useCallback(() => setDirty(true), []);

  const startLayerDrag = useCallback(
    (key: LayerKey, e: React.PointerEvent) => {
      e.preventDefault();
      const wrap = canvasWrapRef.current;
      if (!wrap) return;
      const r = wrap.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const originX = layout[key].xPct;
      const originY = layout[key].yPct;

      function move(ev: PointerEvent) {
        const dx = ((ev.clientX - startX) / r.width) * 100;
        const dy = ((ev.clientY - startY) / r.height) * 100;
        setLayout((L) => ({
          ...L,
          [key]: {
            ...L[key],
            xPct: clamp(originX + dx, 0, 100),
            yPct: clamp(originY + dy, 0, 100),
          },
        }));
        markDirty();
      }
      function up() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [layout, markDirty]
  );

  async function uploadFile(file: File) {
    setUploadBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await r.json().catch(() => ({}));
    setUploadBusy(false);
    if (!r.ok) {
      alert((data as { error?: string }).error ?? "Upload failed");
      return;
    }
    setBackgroundUrl(data.url);
    setMediaKind(data.mediaKind === "VIDEO" ? "VIDEO" : "IMAGE");
    markDirty();
  }

  async function save() {
    const tid = teamId ? Number(teamId) : null;
    if (!tid) {
      alert("Team is required.");
      return;
    }
    setSaveBusy(true);
    const r = await fetch(`/api/scenes/${scene.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        backgroundUrl: backgroundUrl.trim(),
        themeColor,
        mediaKind,
        teamId: tid,
        layoutJson: serializeSceneLayout(layout),
      }),
    });
    setSaveBusy(false);
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert((err as { error?: string }).error ?? "Could not save");
      return;
    }
    setDirty(false);
    onSaved();
  }

  const visualScene = {
    name: name.trim() || scene.name,
    backgroundUrl,
    themeColor,
    mediaKind,
    layout: {
      ...layout,
      headline: { ...layout.headline, content: layout.headline.content || name.trim() || "Headline" },
    },
  };

  const backHref =
    teamIdQs != null ? `/admin/scenes?teamId=${encodeURIComponent(teamIdQs)}` : "/admin/scenes";

  function setTemplate(tid: LayoutTemplateId) {
    setLayout((prev) => applyTemplateKeepCopy(tid, prev, name.trim() || scene.name));
    setSelectedLayer(null);
    markDirty();
  }

  function patchLayer(key: LayerKey, patch: Partial<SceneLayoutState[LayerKey]>) {
    setLayout((L) => ({ ...L, [key]: { ...L[key], ...patch } }));
    markDirty();
  }

  const layer = selectedLayer ? layout[selectedLayer] : null;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-600">
            Boxout-style templates · drag text blocks on the canvas · changes are local until you save.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={backHref}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to scenes
            </Link>
            <button
              type="button"
              disabled={saveBusy || !dirty}
              onClick={() => void save()}
              className="rounded-lg bg-[#52A88E] px-5 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-[#469178] disabled:opacity-50"
            >
              {saveBusy ? "Saving…" : "Save scene"}
            </button>
          </div>
        </div>

        <div
          ref={canvasWrapRef}
          className="overflow-hidden rounded-xl border-2 border-slate-800 shadow-2xl ring-1 ring-black/20"
        >
          <SceneScreenView
            scene={visualScene}
            sourceLabel="Preview"
            editMode
            selectedLayer={selectedLayer}
            onSelectLayer={setSelectedLayer}
            onLayerPointerDown={startLayerDrag}
            className="rounded-lg"
          />
        </div>

        <div>
          <h3 className="font-gdl-display text-xs font-bold uppercase tracking-widest text-slate-500">
            Templates
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {TEMPLATE_IDS.map((tid) => (
              <button
                key={tid}
                type="button"
                onClick={() => setTemplate(tid)}
                className={`overflow-hidden rounded-lg border-2 text-left transition-colors ${
                  layout.templateId === tid
                    ? "border-[#52A88E] ring-2 ring-[#52A88E]/30"
                    : "border-slate-200 hover:border-slate-400"
                }`}
              >
                <div className="pointer-events-none aspect-video scale-[0.98]">
                  <SceneScreenView
                    scene={{
                      name: "Preview",
                      backgroundUrl: scene.backgroundUrl,
                      themeColor,
                      mediaKind,
                      layout: defaultLayoutForTemplate(tid, "PREVIEW"),
                    }}
                    sourceLabel="TV"
                    videoPaused
                    className="!rounded-none"
                  />
                </div>
                <div className="border-t border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="font-gdl-display text-[11px] font-bold uppercase tracking-wide text-slate-900">
                    {TEMPLATE_META[tid].label}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
                    {TEMPLATE_META[tid].description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <aside className="w-full shrink-0 space-y-6 lg:w-80">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-gdl-display text-xs font-bold uppercase tracking-widest text-slate-500">
            Scene details
          </h3>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500">Name</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Team</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  markDirty();
                }}
              >
                <option value="">Select…</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Theme color</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded border border-slate-200"
                  value={themeColor}
                  onChange={(e) => {
                    setThemeColor(e.target.value);
                    markDirty();
                  }}
                />
                <input
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-2 font-mono text-xs"
                  value={themeColor}
                  onChange={(e) => {
                    setThemeColor(e.target.value);
                    markDirty();
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Media URL</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                value={backgroundUrl}
                onChange={(e) => {
                  setBackgroundUrl(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Media kind</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={mediaKind}
                onChange={(e) => {
                  setMediaKind(e.target.value);
                  markDirty();
                }}
              >
                <option value="URL">URL</option>
                <option value="IMAGE">Image</option>
                <option value="VIDEO">Video</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">Upload</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                disabled={uploadBusy}
                className="mt-1 block w-full text-xs"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void uploadFile(f);
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-gdl-display text-xs font-bold uppercase tracking-widest text-slate-500">
            Graphic options
          </h3>
          <div className="mt-4 space-y-3">
            {(
              [
                ["showBroadcastFrame", "Broadcast frame / plate"] as const,
                ["showVignette", "Vignette & depth"] as const,
                ["showGoldRule", "Gold accent rule"] as const,
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={layout[key]}
                  onChange={(e) => {
                    setLayout((L) => ({ ...L, [key]: e.target.checked }));
                    markDirty();
                  }}
                  className="rounded border-slate-300"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-gdl-display text-xs font-bold uppercase tracking-widest text-slate-500">
            Text layer
          </h3>
          {!selectedLayer || !layer ? (
            <p className="mt-3 text-sm text-slate-500">
              Select a text block on the canvas to edit copy, size, and alignment.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Content</label>
                <textarea
                  className="mt-1 min-h-[72px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={layer.content}
                  onChange={(e) => patchLayer(selectedLayer, { content: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">
                  Size ({layer.fontSizePct.toFixed(1)}% of frame height)
                </label>
                <input
                  type="range"
                  min={0.8}
                  max={14}
                  step={0.1}
                  value={layer.fontSizePct}
                  onChange={(e) => patchLayer(selectedLayer, { fontSizePct: Number(e.target.value) })}
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">
                  Max width ({layer.maxWidthPct.toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min={20}
                  max={100}
                  step={1}
                  value={layer.maxWidthPct}
                  onChange={(e) => patchLayer(selectedLayer, { maxWidthPct: Number(e.target.value) })}
                  className="mt-1 w-full"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Alignment</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={layer.align}
                  onChange={(e) =>
                    patchLayer(selectedLayer, {
                      align: e.target.value as SceneTextLayer["align"],
                    })
                  }
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <p className="text-xs text-slate-400">
                Position: drag on canvas · X {layer.xPct.toFixed(1)}% · Y {layer.yPct.toFixed(1)}%
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
