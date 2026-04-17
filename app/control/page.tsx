"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Group = { id: number; name: string };
type OrgRef = { id: number; name: string };
type Team = { id: number; name: string; groups?: Group[]; organization: OrgRef };
type Scene = {
  id: number;
  name: string;
  backgroundUrl: string;
  themeColor: string;
  mediaKind: string;
};
type WallSnapshot = {
  id: number;
  name: string;
  displayCount: number;
  previewUrl: string | null;
  previewMediaKind: string;
  previewThemeColor: string;
  groupId: number;
  groupName: string;
};

type Step =
  | { type: "orgs" }
  | { type: "teams"; org: OrgRef }
  | { type: "live"; org: OrgRef; team: Team };

type ControlTab = "favorites" | "scenes" | "groups";

function StarButton({
  filled,
  disabled,
  label,
  onClick,
}: {
  filled: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--gdl-border)] bg-[var(--gdl-deep)] text-[var(--gdl-gold-mid)] transition hover:bg-[var(--gdl-elevated)] disabled:opacity-40"
    >
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.5}>
        {filled ? (
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 00-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 00-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 00.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        )}
      </svg>
    </button>
  );
}

function ScenePreview({ scene, className }: { scene: Pick<Scene, "backgroundUrl" | "mediaKind">; className?: string }) {
  return (
    <div className={`relative aspect-video shrink-0 bg-black ${className ?? "w-[min(44%,200px)] sm:w-[38%]"}`}>
      {scene.mediaKind === "VIDEO" ? (
        <video
          className="h-full w-full object-contain object-center"
          src={scene.backgroundUrl}
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={scene.backgroundUrl} alt="" className="h-full w-full object-contain object-center" />
      )}
    </div>
  );
}

export default function ControlPage() {
  const [step, setStep] = useState<Step>({ type: "orgs" });
  const [teams, setTeams] = useState<Team[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [scenesLoading, setScenesLoading] = useState(false);
  const [tab, setTab] = useState<ControlTab>("favorites");
  const [focusedGroup, setFocusedGroup] = useState<Group | null>(null);
  const [groupWallById, setGroupWallById] = useState<Record<number, WallSnapshot[]>>({});
  const [groupWallLoading, setGroupWallLoading] = useState(false);
  const [favorites, setFavorites] = useState<{ scenes: Scene[]; wallSnapshots: WallSnapshot[] }>({
    scenes: [],
    wallSnapshots: [],
  });
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  const organizations = useMemo(() => {
    const map = new Map<number, { id: number; name: string; teams: Team[] }>();
    for (const t of teams) {
      const oid = t.organization.id;
      const oname = t.organization.name;
      if (!map.has(oid)) {
        map.set(oid, { id: oid, name: oname, teams: [] });
      }
      map.get(oid)!.teams.push(t);
    }
    return [...map.values()]
      .map((o) => ({
        ...o,
        teams: [...o.teams].sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams]);

  const favoriteSceneIds = useMemo(() => new Set(favorites.scenes.map((s) => s.id)), [favorites.scenes]);
  const favoriteWallIds = useMemo(() => new Set(favorites.wallSnapshots.map((w) => w.id)), [favorites.wallSnapshots]);

  const loadTeams = useCallback(async () => {
    const r = await fetch("/api/teams");
    if (!r.ok) {
      setTeams([]);
      setLoading(false);
      showToast("Could not load teams");
      return;
    }
    const data = (await r.json()) as Team[];
    setTeams(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  const liveTeam = step.type === "live" ? step.team : null;

  useEffect(() => {
    if (!liveTeam) {
      setScenes([]);
      setTab("favorites");
      setFocusedGroup(null);
      setGroupWallById({});
      setFavorites({ scenes: [], wallSnapshots: [] });
      return;
    }
    let cancelled = false;
    setScenesLoading(true);
    (async () => {
      const r = await fetch(`/api/scenes?teamId=${liveTeam.id}`);
      const data = await r.json().catch(() => []);
      if (!cancelled) {
        setScenes(Array.isArray(data) ? data : []);
        setScenesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [liveTeam?.id]);

  useEffect(() => {
    if (!liveTeam) return;
    let cancelled = false;
    setFavoritesLoading(true);
    (async () => {
      const r = await fetch(`/api/control/favorites?teamId=${liveTeam.id}`);
      const data = await r.json().catch(() => ({}));
      if (cancelled) return;
      if (!r.ok) {
        setFavorites({ scenes: [], wallSnapshots: [] });
        setFavoritesLoading(false);
        return;
      }
      setFavorites({
        scenes: Array.isArray(data.scenes) ? data.scenes : [],
        wallSnapshots: Array.isArray(data.wallSnapshots) ? data.wallSnapshots : [],
      });
      setFavoritesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [liveTeam?.id]);

  useEffect(() => {
    if (tab !== "groups" || !liveTeam || !focusedGroup) return;
    let cancelled = false;
    setGroupWallLoading(true);
    (async () => {
      const r = await fetch(`/api/groups/${focusedGroup.id}/wall-scenes`);
      const j = (await r.json().catch(() => ({}))) as { snapshots?: WallSnapshot[] };
      if (!cancelled) {
        const list = Array.isArray(j.snapshots) ? j.snapshots : [];
        setGroupWallById((m) => ({ ...m, [focusedGroup.id]: list }));
        setGroupWallLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, liveTeam?.id, focusedGroup?.id]);

  const refreshFavorites = useCallback(async () => {
    if (!liveTeam) return;
    const r = await fetch(`/api/control/favorites?teamId=${liveTeam.id}`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return;
    setFavorites({
      scenes: Array.isArray(data.scenes) ? data.scenes : [],
      wallSnapshots: Array.isArray(data.wallSnapshots) ? data.wallSnapshots : [],
    });
  }, [liveTeam?.id]);

  const setSceneFavorite = useCallback(
    async (sceneId: number, favorite: boolean) => {
      if (!liveTeam) return;
      const r = await fetch("/api/control/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "scene", teamId: liveTeam.id, sceneId, favorite }),
      });
      if (!r.ok) {
        showToast("Could not update favorite");
        return;
      }
      await refreshFavorites();
    },
    [liveTeam, refreshFavorites, showToast]
  );

  const setWallFavorite = useCallback(
    async (wallSnapshotId: number, favorite: boolean) => {
      if (!liveTeam) return;
      const r = await fetch("/api/control/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "wall", teamId: liveTeam.id, wallSnapshotId, favorite }),
      });
      if (!r.ok) {
        showToast("Could not update favorite");
        return;
      }
      await refreshFavorites();
    },
    [liveTeam, refreshFavorites, showToast]
  );

  async function goLive(sceneId: number) {
    if (!liveTeam) return;
    setBusy(true);
    const r = await fetch("/api/control/broadcast-scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: liveTeam.id, sceneId }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      showToast((data as { error?: string }).error ?? "Could not switch scene");
      return;
    }
    const updated = (data as { updated?: number }).updated ?? 0;
    showToast(
      updated === 0
        ? "No paired screens for this team yet"
        : `Graphics live on ${updated} screen${updated === 1 ? "" : "s"}`
    );
  }

  async function resumeSchedule() {
    if (!liveTeam) return;
    setBusy(true);
    const r = await fetch("/api/control/clear-override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: liveTeam.id }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      showToast((data as { error?: string }).error ?? "Could not clear override");
      return;
    }
    const updated = (data as { updated?: number }).updated ?? 0;
    showToast(
      updated === 0
        ? "No displays to update"
        : `Overrides cleared on ${updated} screen${updated === 1 ? "" : "s"}`
    );
  }

  async function applyWallScene(groupId: number, wallSnapshotId: number) {
    setBusy(true);
    const r = await fetch(`/api/groups/${groupId}/broadcast-scene`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallSnapshotId }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      showToast((data as { error?: string }).error ?? "Could not apply wall scene");
      return;
    }
    const updated = (data as { updated?: number }).updated ?? 0;
    showToast(
      updated === 0
        ? "No paired screens in that group"
        : `Wall layout live on ${updated} screen${updated === 1 ? "" : "s"}`
    );
  }

  async function clearWallGroup(groupId: number) {
    setBusy(true);
    const r = await fetch(`/api/groups/${groupId}/broadcast-scene`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      showToast((data as { error?: string }).error ?? "Could not clear group");
      return;
    }
    const updated = (data as { updated?: number }).updated ?? 0;
    showToast(
      updated === 0
        ? "No screens updated"
        : `Group cleared on ${updated} screen${updated === 1 ? "" : "s"}`
    );
  }

  function goBack() {
    if (step.type === "live") {
      setStep({ type: "teams", org: step.org });
    } else if (step.type === "teams") {
      setStep({ type: "orgs" });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center font-gdl-display text-xl text-[var(--gdl-muted)]">
        Loading…
      </div>
    );
  }

  const headerTitle =
    step.type === "orgs"
      ? "Pick organization"
      : step.type === "teams"
        ? step.org.name
        : step.team.name;

  const headerSubtitle =
    step.type === "orgs"
      ? "Live control"
      : step.type === "teams"
        ? "Pick a team"
        : step.org.name;

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--gdl-deep)]">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--gdl-border)] bg-[var(--gdl-panel)]/90 px-4 py-4 backdrop-blur-md md:gap-4 md:px-8">
        {step.type !== "orgs" ? (
          <button
            type="button"
            onClick={goBack}
            className="font-gdl-display min-h-[52px] min-w-[52px] rounded-lg border border-[var(--gdl-border)] bg-[var(--gdl-elevated)] px-5 text-lg font-semibold tracking-wide text-[var(--gdl-text)] active:bg-[var(--gdl-deep)]"
          >
            ← Back
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="font-gdl-display text-[10px] font-semibold uppercase tracking-[0.45em] text-[var(--gdl-teal-soft)]">
            {headerSubtitle}
          </p>
          <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-[var(--gdl-text)] md:text-4xl">
            {headerTitle}
          </h1>
        </div>
        <Link
          href="/admin"
          className="font-gdl-display min-h-[52px] rounded-lg border border-[var(--gdl-border)] bg-[var(--gdl-elevated)] px-4 py-3 text-center text-sm font-semibold tracking-wide text-[var(--gdl-muted)] active:bg-[var(--gdl-deep)] md:px-5"
        >
          Dashboard
        </Link>
        <Link
          href="/admin/displays"
          className="font-gdl-display min-h-[52px] rounded-lg border border-[var(--gdl-teal)] bg-[rgba(82,168,142,0.15)] px-5 py-3 text-center text-base font-semibold tracking-wide text-[var(--gdl-teal-soft)] active:bg-[rgba(82,168,142,0.28)]"
        >
          Pair screens
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-28 md:p-8 md:pb-32">
        {step.type === "orgs" && (
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
            {organizations.length === 0 ? (
              <p className="col-span-full text-center font-gdl-display text-lg text-[var(--gdl-muted)]">
                No organizations with teams yet. Add teams in Admin.
              </p>
            ) : (
              organizations.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setStep({ type: "teams", org: { id: o.id, name: o.name } })}
                  className="font-gdl-display min-h-[120px] rounded-xl border-2 border-[var(--gdl-border)] bg-[var(--gdl-panel)] p-8 text-left text-2xl font-bold uppercase tracking-wide text-[var(--gdl-text)] active:border-[var(--gdl-teal)] active:bg-[var(--gdl-elevated)] md:min-h-[140px] md:p-10 md:text-3xl"
                >
                  {o.name}
                  <span className="mt-3 block text-sm font-normal normal-case tracking-normal text-[var(--gdl-muted)]">
                    {o.teams.length} team{o.teams.length === 1 ? "" : "s"}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {step.type === "teams" && (
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2">
            {organizations
              .find((o) => o.id === step.org.id)
              ?.teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setStep({ type: "live", org: step.org, team: t })}
                  className="font-gdl-display min-h-[120px] rounded-xl border-2 border-[var(--gdl-border)] bg-[var(--gdl-panel)] p-8 text-left text-2xl font-bold uppercase tracking-wide text-[var(--gdl-text)] active:border-[var(--gdl-teal)] active:bg-[var(--gdl-elevated)] md:min-h-[140px] md:p-10 md:text-3xl"
                >
                  {t.name}
                  {(t.groups?.length ?? 0) > 0 ? (
                    <span className="mt-3 block text-sm font-normal normal-case tracking-normal text-[var(--gdl-muted)]">
                      {t.groups!.length} group{t.groups!.length === 1 ? "" : "s"}
                    </span>
                  ) : (
                    <span className="mt-3 block text-sm font-normal normal-case tracking-normal text-[var(--gdl-muted)]">
                      Team graphics only
                    </span>
                  )}
                </button>
              ))}
          </div>
        )}

        {step.type === "live" && (
          <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-wrap gap-2 rounded-xl border border-[var(--gdl-border)] bg-[var(--gdl-panel)] p-1.5">
              {(["favorites", "scenes", "groups"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    setFocusedGroup(null);
                  }}
                  className={`font-gdl-display min-h-[48px] flex-1 rounded-lg px-3 text-sm font-bold uppercase tracking-wide md:min-h-[52px] md:px-4 md:text-base ${
                    tab === t
                      ? "bg-[var(--gdl-teal)] text-white"
                      : "text-[var(--gdl-muted)] active:bg-[var(--gdl-elevated)]"
                  }`}
                >
                  {t === "favorites" ? "Favorites" : t === "scenes" ? "Scenes" : "Groups"}
                </button>
              ))}
            </div>

            {tab === "favorites" && (
              <>
                {favoritesLoading ? (
                  <p className="text-center font-gdl-display text-[var(--gdl-muted)]">Loading favorites…</p>
                ) : favorites.scenes.length === 0 && favorites.wallSnapshots.length === 0 ? (
                  <p className="text-center font-gdl-display text-lg text-[var(--gdl-muted)]">
                    No favorites yet. Star scenes from <strong className="text-[var(--gdl-chrome)]">Scenes</strong> or{" "}
                    <strong className="text-[var(--gdl-chrome)]">Groups</strong>.
                  </p>
                ) : (
                  <div className="space-y-8">
                    {favorites.scenes.length > 0 ? (
                      <section>
                        <p className="font-gdl-display mb-3 text-xs uppercase tracking-[0.35em] text-[var(--gdl-muted)]">
                          Team graphics
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {favorites.scenes.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              disabled={busy}
                              onClick={() => void goLive(s.id)}
                              className="flex min-h-[120px] overflow-hidden rounded-xl border-2 border-[var(--gdl-border)] bg-[var(--gdl-panel)] text-left active:border-[var(--gdl-teal)] active:bg-[var(--gdl-elevated)]"
                            >
                              <ScenePreview scene={s} />
                              <div className="flex min-w-0 flex-1 flex-col justify-center border-l border-[var(--gdl-border)] px-4 py-3">
                                <span
                                  className="mb-2 inline-block h-1 w-12 rounded-full"
                                  style={{ backgroundColor: s.themeColor }}
                                  aria-hidden
                                />
                                <span className="font-gdl-display text-lg font-bold uppercase tracking-wide text-[var(--gdl-text)] md:text-xl">
                                  {s.name}
                                </span>
                                <span className="mt-1 text-sm text-[var(--gdl-muted)]">Tap to go live</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    ) : null}
                    {favorites.wallSnapshots.length > 0 ? (
                      <section>
                        <p className="font-gdl-display mb-3 text-xs uppercase tracking-[0.35em] text-[var(--gdl-muted)]">
                          Wall layouts
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {favorites.wallSnapshots.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              disabled={busy}
                              onClick={() => void applyWallScene(s.groupId, s.id)}
                              className="flex min-h-[120px] overflow-hidden rounded-xl border-2 border-[var(--gdl-border)] bg-[var(--gdl-panel)] text-left active:border-[var(--gdl-teal)] active:bg-[var(--gdl-elevated)]"
                            >
                              <div className="relative aspect-video w-[min(44%,200px)] shrink-0 bg-black sm:w-[38%]">
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
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={s.previewUrl}
                                      alt=""
                                      className="h-full w-full object-contain object-center"
                                    />
                                  )
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase text-[var(--gdl-muted)]">
                                    No preview
                                  </div>
                                )}
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col justify-center border-l border-[var(--gdl-border)] px-4 py-3">
                                <span className="font-gdl-display text-lg font-bold uppercase tracking-wide text-[var(--gdl-text)] md:text-xl">
                                  {s.name}
                                </span>
                                <span className="mt-1 text-sm text-[var(--gdl-muted)]">
                                  {s.groupName} · tap to go live
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </div>
                )}
              </>
            )}

            {tab === "scenes" && (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void resumeSchedule()}
                  className="font-gdl-display w-full min-h-[88px] rounded-xl border-2 border-[var(--gdl-teal)] bg-[rgba(82,168,142,0.08)] p-6 text-left text-xl font-bold uppercase tracking-wide text-[var(--gdl-teal-soft)] active:bg-[rgba(82,168,142,0.15)]"
                >
                  Clear team overrides
                  <span className="mt-2 block text-base font-normal normal-case tracking-normal text-[var(--gdl-muted)]">
                    Remove manual graphics & direct media on paired screens — schedules apply again
                  </span>
                </button>

                <p className="font-gdl-display text-xs uppercase tracking-[0.35em] text-[var(--gdl-muted)]">
                  All team scenes · star to add to Favorites
                </p>

                {scenesLoading ? (
                  <p className="text-center font-gdl-display text-[var(--gdl-muted)]">Loading scenes…</p>
                ) : scenes.length === 0 ? (
                  <p className="text-center font-gdl-display text-lg text-[var(--gdl-muted)]">
                    No scenes for this team. Build them in{" "}
                    <Link href="/admin/scenes" className="text-[var(--gdl-teal-soft)] underline">
                      Admin → Scenes
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {scenes.map((s) => (
                      <div
                        key={s.id}
                        className="flex min-h-[120px] overflow-hidden rounded-xl border-2 border-[var(--gdl-border)] bg-[var(--gdl-panel)]"
                      >
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void goLive(s.id)}
                          className="flex min-w-0 flex-1 overflow-hidden text-left active:bg-[var(--gdl-elevated)]"
                        >
                          <ScenePreview scene={s} />
                          <div className="flex min-w-0 flex-1 flex-col justify-center border-l border-[var(--gdl-border)] px-4 py-3">
                            <span
                              className="mb-2 inline-block h-1 w-12 rounded-full"
                              style={{ backgroundColor: s.themeColor }}
                              aria-hidden
                            />
                            <span className="font-gdl-display text-lg font-bold uppercase tracking-wide text-[var(--gdl-text)] md:text-xl">
                              {s.name}
                            </span>
                            <span className="mt-1 text-sm text-[var(--gdl-muted)]">
                              {s.mediaKind === "VIDEO" ? "Video" : s.mediaKind === "IMAGE" ? "Image" : "Media"}
                            </span>
                          </div>
                        </button>
                        <div className="flex shrink-0 items-center border-l border-[var(--gdl-border)] bg-[var(--gdl-deep)] p-2">
                          <StarButton
                            filled={favoriteSceneIds.has(s.id)}
                            disabled={busy}
                            label={favoriteSceneIds.has(s.id) ? "Remove from favorites" : "Add to favorites"}
                            onClick={() => void setSceneFavorite(s.id, !favoriteSceneIds.has(s.id))}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === "groups" && (
              <>
                {!focusedGroup ? (
                  <>
                    <p className="text-sm leading-relaxed text-[var(--gdl-muted)]">
                      Open a group to see saved wall scenes. Star layouts to pin them to{" "}
                      <strong className="text-[var(--gdl-chrome)]">Favorites</strong>.
                    </p>
                    {(step.team.groups ?? []).length === 0 ? (
                      <p className="text-center font-gdl-display text-lg text-[var(--gdl-muted)]">
                        No groups for this team. Add them in Admin → Groups.
                      </p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {(step.team.groups ?? []).map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setFocusedGroup(g);
                              setTab("groups");
                            }}
                            className="font-gdl-display min-h-[100px] rounded-xl border-2 border-[var(--gdl-border)] bg-[var(--gdl-panel)] p-6 text-left text-xl font-bold uppercase tracking-wide text-[var(--gdl-text)] active:border-[var(--gdl-teal)] active:bg-[var(--gdl-elevated)]"
                          >
                            {g.name}
                            <span className="mt-2 block text-sm font-normal normal-case tracking-normal text-[var(--gdl-muted)]">
                              Wall scenes →
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFocusedGroup(null)}
                        className="font-gdl-display rounded-lg border border-[var(--gdl-border)] bg-[var(--gdl-elevated)] px-4 py-2 text-sm font-semibold text-[var(--gdl-text)]"
                      >
                        ← All groups
                      </button>
                      <h2 className="font-gdl-display text-xl font-bold uppercase tracking-wide text-[var(--gdl-text)]">
                        {focusedGroup.name}
                      </h2>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void clearWallGroup(focusedGroup.id)}
                        className="ml-auto rounded-lg border border-[var(--gdl-border)] px-3 py-2 text-sm font-semibold text-[var(--gdl-muted)] active:bg-[var(--gdl-elevated)]"
                      >
                        Clear group
                      </button>
                    </div>
                    {groupWallLoading ? (
                      <p className="text-center font-gdl-display text-[var(--gdl-muted)]">Loading wall scenes…</p>
                    ) : (groupWallById[focusedGroup.id] ?? []).length === 0 ? (
                      <p className="text-sm text-[var(--gdl-muted)]">
                        No saved wall scenes. Use <strong className="text-[var(--gdl-chrome)]">Save as scene</strong>{" "}
                        in Admin for this group.
                      </p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {(groupWallById[focusedGroup.id] ?? []).map((s) => (
                          <div
                            key={s.id}
                            className="flex min-h-[120px] overflow-hidden rounded-xl border-2 border-[var(--gdl-border)] bg-[var(--gdl-panel)]"
                          >
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void applyWallScene(focusedGroup.id, s.id)}
                              className="flex min-w-0 flex-1 overflow-hidden text-left active:bg-[var(--gdl-elevated)]"
                            >
                              <div className="relative aspect-video w-[min(44%,200px)] shrink-0 bg-black sm:w-[38%]">
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
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={s.previewUrl}
                                      alt=""
                                      className="h-full w-full object-contain object-center"
                                    />
                                  )
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[10px] font-bold uppercase text-[var(--gdl-muted)]">
                                    No preview
                                  </div>
                                )}
                              </div>
                              <div className="flex min-w-0 flex-1 flex-col justify-center border-l border-[var(--gdl-border)] px-4 py-3">
                                <span className="font-gdl-display text-lg font-bold uppercase tracking-wide text-[var(--gdl-text)] md:text-xl">
                                  {s.name}
                                </span>
                                <span className="mt-1 text-sm text-[var(--gdl-muted)]">
                                  {s.displayCount} screen{s.displayCount === 1 ? "" : "s"}
                                </span>
                              </div>
                            </button>
                            <div className="flex shrink-0 items-center border-l border-[var(--gdl-border)] bg-[var(--gdl-deep)] p-2">
                              <StarButton
                                filled={favoriteWallIds.has(s.id)}
                                disabled={busy}
                                label={favoriteWallIds.has(s.id) ? "Remove from favorites" : "Add to favorites"}
                                onClick={() => void setWallFavorite(s.id, !favoriteWallIds.has(s.id))}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-lg rounded-lg border border-[var(--gdl-teal)] bg-[var(--gdl-panel)] px-6 py-4 text-center font-gdl-display text-lg font-semibold text-[var(--gdl-teal-soft)] shadow-2xl md:left-1/2 md:right-auto md:-translate-x-1/2"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
