"use client";

import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Team = { id: number; name: string };
type Scene = {
  id: number;
  name: string;
  teamId: number | null;
  team: Team | null;
  backgroundUrl: string;
  themeColor: string;
  mediaKind: string;
  layoutJson: string;
};

function ScenesInner() {
  const searchParams = useSearchParams();
  const teamIdQs = searchParams.get("teamId");
  const teamFilterNum =
    teamIdQs != null && teamIdQs !== "" && Number.isFinite(Number(teamIdQs))
      ? Number(teamIdQs)
      : null;

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveSceneIds, setLiveSceneIds] = useState<Set<number> | null>(null);

  const load = useCallback(async () => {
    const [sRes, tRes] = await Promise.all([fetch("/api/scenes"), fetch("/api/teams")]);
    setScenes(await sRes.json());
    setTeams(await tRes.json());

    if (teamFilterNum != null) {
      const liveRes = await fetch(`/api/scenes/live-scene-ids?teamId=${teamFilterNum}`);
      const liveJson = (await liveRes.json()) as { sceneIds?: number[] };
      setLiveSceneIds(new Set(liveJson.sceneIds ?? []));
    } else {
      setLiveSceneIds(null);
    }

    setLoading(false);
  }, [teamFilterNum]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-slate-500">Loading scenes…</p>;
  }

  const teamForCrumb = teams.find((t) => t.id === teamFilterNum);
  const filteredScenes =
    teamFilterNum != null ? scenes.filter((s) => s.teamId === teamFilterNum) : scenes;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <AdminBreadcrumb
        items={[
          { label: "Dashboard", href: "/admin" },
          {
            label: teamForCrumb ? `${teamForCrumb.name} scenes` : "All scenes",
          },
        ]}
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900 md:text-4xl">
            Locker scenes
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
            These are <strong>facility graphics</strong> for schedules and the scene editor. To save a{" "}
            <strong>multi-screen wall layout</strong> (different content per TV), use{" "}
            <strong>Save as scene</strong> on a{" "}
            <Link href="/admin/groups" className="font-semibold text-[#3d7d6c] underline">
              group wall
            </Link>{" "}
            — that stores only a title and remembers each paired screen&apos;s current feed.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {filteredScenes.length === 0 ? (
          <p className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-6 py-12 text-center text-slate-600">
            No facility scenes yet. Add one for schedules, or use{" "}
            <Link href="/admin/groups" className="font-semibold text-[#3d7d6c] underline">
              Groups → wall scenes
            </Link>{" "}
            for per-screen layouts.
          </p>
        ) : (
          filteredScenes.map((s) => (
            <SceneCard
              key={s.id}
              scene={s}
              isLive={liveSceneIds?.has(s.id) ?? false}
              teamFilterNum={teamFilterNum}
              onDeleted={() => void load()}
            />
          ))
        )}
      </div>

      {teamFilterNum == null ? (
        <p className="text-center text-sm text-slate-500">
          Open a locker room from the sidebar to filter by team. The{" "}
          <span className="font-semibold text-[#3d7d6c]">Active</span> badge shows which roster looks
          are on screens right now (live control or schedule).
        </p>
      ) : null}
    </div>
  );
}

export default function AdminScenesPage() {
  return (
    <Suspense fallback={<p className="p-4 text-slate-500">Loading scenes…</p>}>
      <ScenesInner />
    </Suspense>
  );
}

function SceneCard({
  scene,
  isLive,
  teamFilterNum,
  onDeleted,
}: {
  scene: Scene;
  isLive: boolean;
  teamFilterNum: number | null;
  onDeleted: () => void;
}) {
  const editHref =
    teamFilterNum != null
      ? `/admin/scenes/${scene.id}/edit?teamId=${teamFilterNum}`
      : `/admin/scenes/${scene.id}/edit`;

  async function remove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this scene? Related schedules will be removed.")) return;
    await fetch(`/api/scenes/${scene.id}`, { method: "DELETE" });
    onDeleted();
  }

  const isVideo = scene.mediaKind === "VIDEO";

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-300 bg-slate-900 shadow-md ring-1 ring-black/5 transition hover:border-[#52A88E]/60 hover:ring-[#52A88E]/20">
      <div className="relative aspect-[16/10] min-h-[200px] bg-slate-800 md:min-h-[220px]">
        <Link
          href={editHref}
          className="absolute inset-0 z-[5] text-[0]"
          aria-label={`Open graphic editor for ${scene.name}`}
        >
          <span className="sr-only">Open graphic editor</span>
        </Link>
        {isLive ? (
          <span className="pointer-events-none absolute right-3 top-3 z-10 rounded bg-[#52A88E] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
            Active
          </span>
        ) : null}
        <button
          type="button"
          onClick={remove}
          className="absolute bottom-3 right-3 z-20 rounded bg-black/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-red-300 backdrop-blur-sm hover:bg-red-950/90 hover:text-white"
        >
          Delete
        </button>
        {isVideo ? (
          <video
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain object-center"
            src={scene.backgroundUrl}
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- scene asset URLs
          <img
            className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain object-center"
            src={scene.backgroundUrl}
            alt=""
          />
        )}
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-[0.18]"
          style={{ backgroundColor: scene.themeColor }}
        />
        <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
          <span className="rounded-lg bg-[#52A88E] px-4 py-2 font-gdl-display text-sm font-bold uppercase tracking-widest text-white shadow-lg">
            Open graphic editor
          </span>
        </div>
      </div>
      <Link
        href={editHref}
        className="block border-t border-slate-700 bg-slate-900 p-4 text-left transition hover:bg-slate-800/80"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-gdl-display truncate text-lg font-bold uppercase tracking-wide text-white md:text-xl">
              {scene.name}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              {scene.team?.name ?? "No team"} · {scene.mediaKind} · Boxout layout
            </p>
          </div>
        </div>
      </Link>
    </div>
  );
}
