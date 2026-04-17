"use client";

import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { SceneGraphicEditor } from "@/components/admin/SceneGraphicEditor";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

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

function EditScenePageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const idParam = params.id as string;
  const teamIdQs = searchParams.get("teamId");

  const [scene, setScene] = useState<SceneRow | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const sid = Number(idParam);
    if (!Number.isFinite(sid)) {
      setError("Invalid scene");
      setLoading(false);
      return;
    }
    const [sRes, tRes] = await Promise.all([
      fetch(`/api/scenes/${sid}`),
      fetch("/api/teams"),
    ]);
    setTeams(await tRes.json());
    if (!sRes.ok) {
      setError(sRes.status === 404 ? "Scene not found" : "Could not load scene");
      setScene(null);
      setLoading(false);
      return;
    }
    setScene((await sRes.json()) as SceneRow);
    setError(null);
    setLoading(false);
  }, [idParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const teamForCrumb = teams.find((t) => t.id === scene?.teamId);

  if (loading) {
    return <p className="text-slate-500">Loading editor…</p>;
  }

  if (error || !scene) {
    return (
      <div className="space-y-4">
        <AdminBreadcrumb
          items={[
            { label: "Dashboard", href: "/admin" },
            { label: "Scenes", href: "/admin/scenes" },
            { label: "Edit" },
          ]}
        />
        <p className="text-red-700">{error ?? "Unknown error"}</p>
        <Link href="/admin/scenes" className="text-sm font-semibold text-[#3d7d6c] underline">
          Back to scenes
        </Link>
      </div>
    );
  }

  const scenesListHref =
    teamIdQs != null
      ? `/admin/scenes?teamId=${encodeURIComponent(teamIdQs)}`
      : scene.teamId != null
        ? `/admin/scenes?teamId=${scene.teamId}`
        : "/admin/scenes";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminBreadcrumb
        items={[
          { label: "Dashboard", href: "/admin" },
          {
            label: teamForCrumb ? `${teamForCrumb.name} scenes` : "Scenes",
            href: scenesListHref,
          },
          { label: scene.name },
        ]}
      />
      <div>
        <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900 md:text-3xl">
          Edit scene · graphical layout
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Sports-broadcast templates (Boxout-style): pick a look, drag headline and supporting lines on
          the 16×9 canvas, then save. What you see here matches the TV screen.
        </p>
      </div>

      <SceneGraphicEditor
        key={scene.id}
        scene={scene}
        teams={teams}
        teamIdQs={teamIdQs}
        onSaved={() => void load()}
      />
    </div>
  );
}

export default function EditScenePage() {
  return (
    <Suspense fallback={<p className="text-slate-500">Loading editor…</p>}>
      <EditScenePageInner />
    </Suspense>
  );
}
