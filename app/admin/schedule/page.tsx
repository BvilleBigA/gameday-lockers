"use client";

import { AdminBreadcrumb } from "@/components/admin/AdminBreadcrumb";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Scene = { id: number; name: string; teamId?: number | null };
type ContentAsset = { id: number; name: string; url: string; mediaKind: string };
type Team = { id: number; name: string; groups: { id: number; name: string }[] };
type ScheduleRow = {
  id: number;
  sceneId: number;
  targetType: string;
  targetId: number;
  startTime: string;
  endTime: string;
  targetLabel: string;
  scene: Scene;
};

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + delta);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addHours(date: Date, hours: number) {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date: Date, years: number) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function quarterToLabel(quarter: number) {
  const hours24 = Math.floor(quarter / 4);
  const minutes = (quarter % 4) * 15;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

type ItemType = "SCENE" | "CONTENT";
type ModalMode = "CREATE" | "EDIT";
type DragState = {
  scheduleId: number;
  dayIndex: number;
  durationHours: number;
  snapQuarter: number;
};
type ResizeState = {
  scheduleId: number;
  startDate: Date;
  endDate: Date;
  endDayIndex: number;
  endQuarter: number;
};

export default function AdminSchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ItemType>("SCENE");
  const [sceneId, setSceneId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [targetMode, setTargetMode] = useState<"TEAM" | "GROUP">("TEAM");
  const [targetTeamId, setTargetTeamId] = useState("");
  const [targetGroupId, setTargetGroupId] = useState("");
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("CREATE");
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [navDirection, setNavDirection] = useState<"left" | "right">("right");
  const [animTick, setAnimTick] = useState(0);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [sRes, aRes, tRes, schRes] = await Promise.all([
        fetch("/api/scenes"),
        fetch("/api/content/assets"),
        fetch("/api/teams"),
        fetch("/api/schedules"),
      ]);

      const [sJson, aJson, tJson, schJson] = await Promise.all([
        sRes.json().catch(() => null),
        aRes.json().catch(() => null),
        tRes.json().catch(() => null),
        schRes.json().catch(() => null),
      ]);

      setScenes(Array.isArray(sJson) ? sJson : []);
      setAssets(Array.isArray(aJson) ? aJson : []);
      setTeams(Array.isArray(tJson) ? tJson : []);
      setSchedules(Array.isArray(schJson) ? schJson : []);

      if (!sRes.ok || !aRes.ok || !tRes.ok || !schRes.ok) {
        setLoadError("Some schedule data failed to load. Try refreshing.");
      }
    } catch {
      setLoadError("Could not load schedule data.");
      setScenes([]);
      setAssets([]);
      setTeams([]);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!startLocal || !endLocal) {
      const start = new Date();
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      setStartLocal(toLocalInput(start));
      setEndLocal(toLocalInput(end));
    }
  }, [startLocal, endLocal]);

  const groupsForTeam = useMemo(() => {
    const tid = Number(targetTeamId);
    const team = teams.find((t) => t.id === tid);
    return team?.groups ?? [];
  }, [teams, targetTeamId]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const scheduleBlocksByDay = useMemo(() => {
    const map = new Map<
      string,
      (ScheduleRow & {
        startHour: number;
        durationHours: number;
        targetKey: string;
        isEndSegment: boolean;
        segmentStartTime: string;
      })[]
    >();
    for (const row of schedules) {
      const start = new Date(row.startTime);
      const end = new Date(row.endTime);
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayStart = addDays(weekStart, dayIndex);
        const dayEnd = addDays(dayStart, 1);
        if (end <= dayStart || start >= dayEnd) continue;
        const segStart = start > dayStart ? start : dayStart;
        const segEnd = end < dayEnd ? end : dayEnd;
        const startHour = segStart.getHours() + segStart.getMinutes() / 60;
        const durationHours = Math.max(0.25, (segEnd.getTime() - segStart.getTime()) / (1000 * 60 * 60));
        const key = dayKey(dayStart);
        const list = map.get(key) ?? [];
        list.push({
          ...row,
          startHour,
          durationHours,
          targetKey: `${row.targetType}:${row.targetId}`,
          isEndSegment: segEnd.getTime() === end.getTime(),
          segmentStartTime: segStart.toISOString(),
        });
        map.set(key, list);
      }
    }
    return map;
  }, [schedules, weekStart]);

  const targetColorMap = useMemo(() => {
    const palette = [
      "bg-blue-200/55 border-blue-400 text-blue-950",
      "bg-emerald-200/55 border-emerald-400 text-emerald-950",
      "bg-violet-200/55 border-violet-400 text-violet-950",
      "bg-amber-200/55 border-amber-400 text-amber-950",
      "bg-rose-200/55 border-rose-400 text-rose-950",
      "bg-cyan-200/55 border-cyan-400 text-cyan-950",
      "bg-lime-200/55 border-lime-400 text-lime-950",
    ];
    const keys = [...new Set(schedules.map((s) => `${s.targetType}:${s.targetId}`))];
    const map = new Map<string, string>();
    keys.forEach((k, i) => {
      map.set(k, palette[i % palette.length]);
    });
    return map;
  }, [schedules]);

  function jumpToSlot(day: Date, hour: number) {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = addHours(start, 1);
    setStartLocal(toLocalInput(start));
    setEndLocal(toLocalInput(end));
    setModalMode("CREATE");
    setEditingScheduleId(null);
    setIsModalOpen(true);
  }

  function inferTeamIdForScene(selectedSceneId: number): number | null {
    const scene = scenes.find((s) => s.id === selectedSceneId);
    return scene?.teamId != null ? scene.teamId : null;
  }

  async function ensureSceneIdToSchedule(): Promise<number | null> {
    if (selectedType === "SCENE") {
      const sid = Number(sceneId);
      return Number.isFinite(sid) ? sid : null;
    }

    const aid = Number(assetId);
    if (!Number.isFinite(aid)) return null;
    const asset = assets.find((a) => a.id === aid);
    if (!asset) return null;

    const teamId = Number(targetTeamId);
    if (!Number.isFinite(teamId)) {
      alert("Pick a target team before scheduling content.");
      return null;
    }

    const createRes = await fetch("/api/scenes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Scheduled content: ${asset.name}`,
        teamId,
        backgroundUrl: asset.url,
        mediaKind: asset.mediaKind === "VIDEO" ? "VIDEO" : "IMAGE",
        themeColor: "#1e293b",
      }),
    });
    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      alert(err.error ?? "Failed to create scene from content asset");
      return null;
    }
    const scene = (await createRes.json()) as Scene;
    await load();
    return scene.id;
  }

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault();
    const sid = await ensureSceneIdToSchedule();
    const start = new Date(startLocal);
    const end = new Date(endLocal);
    let targetId: number;
    if (targetMode === "TEAM") {
      targetId = Number(targetTeamId);
    } else {
      targetId = Number(targetGroupId);
    }
    if (!sid || !Number.isFinite(targetId)) {
      alert("Select an item and target.");
      return;
    }

    const sourceTeamId = inferTeamIdForScene(sid);
    if (sourceTeamId != null && targetMode === "TEAM" && sourceTeamId !== Number(targetTeamId)) {
      alert("Selected scene must belong to the selected team.");
      return;
    }

    const r = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sceneId: sid,
        targetType: targetMode,
        targetId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert(err.error ?? "Failed to create schedule");
      return;
    }
    await load();
    setIsModalOpen(false);
  }

  async function removeSchedule(id: number) {
    if (!confirm("Remove this schedule window?")) return;
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    load();
  }

  function openCreateModal() {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    setStartLocal(toLocalInput(now));
    setEndLocal(toLocalInput(addHours(now, 1)));
    setModalMode("CREATE");
    setEditingScheduleId(null);
    setIsModalOpen(true);
  }

  function openEditModal(row: ScheduleRow) {
    setSelectedType("SCENE");
    setSceneId(String(row.sceneId));
    setTargetMode(row.targetType === "GROUP" ? "GROUP" : "TEAM");
    if (row.targetType === "GROUP") {
      setTargetGroupId(String(row.targetId));
    } else {
      setTargetTeamId(String(row.targetId));
      setTargetGroupId("");
    }
    setStartLocal(toLocalInput(new Date(row.startTime)));
    setEndLocal(toLocalInput(new Date(row.endTime)));
    setModalMode("EDIT");
    setEditingScheduleId(row.id);
    setIsModalOpen(true);
  }

  async function saveEditSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!editingScheduleId) return;
    const r = await fetch(`/api/schedules/${editingScheduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: new Date(startLocal).toISOString(),
        endTime: new Date(endLocal).toISOString(),
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert(err.error ?? "Failed to update schedule");
      return;
    }
    await load();
    setIsModalOpen(false);
  }

  function animateNav(next: Date, direction: "left" | "right") {
    setNavDirection(direction);
    setAnimTick((n) => n + 1);
    setWeekStart(next);
  }

  function onDragStart(
    e: React.PointerEvent<HTMLDivElement>,
    row: ScheduleRow,
    dayIndex: number,
    durationHours: number
  ) {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setDragState({
      scheduleId: row.id,
      dayIndex,
      durationHours,
      snapQuarter: Math.max(
        0,
        Math.min(95, Math.round((new Date(row.startTime).getHours() * 60 + new Date(row.startTime).getMinutes()) / 15))
      ),
    });
  }

  function pointerToDayQuarter(clientX: number, clientY: number) {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const colWidth = (rect.width - 64) / 7;
    const xWithin = Math.max(0, Math.min(rect.width - 65, clientX - rect.left - 64));
    const dayIndex = Math.max(0, Math.min(6, Math.floor(xWithin / colWidth)));
    const yWithin = Math.max(0, Math.min(rect.height - 1, clientY - rect.top));
    const quarter = Math.max(0, Math.min(95, Math.round(yWithin / 12)));
    return { dayIndex, quarter };
  }

  function updateDragFromPointer(
    clientX: number,
    clientY: number,
    _startDayIndex: number,
    durationHours: number,
    scheduleId: number
  ) {
    const point = pointerToDayQuarter(clientX, clientY);
    if (!point) return;
    setDragState({
      scheduleId,
      dayIndex: point.dayIndex,
      durationHours,
      snapQuarter: point.quarter,
    });
  }

  async function onDragEnd(row: ScheduleRow) {
    if (!dragState || dragState.scheduleId !== row.id) return;
    const oldStart = new Date(row.startTime);
    const oldEnd = new Date(row.endTime);
    const durationMs = oldEnd.getTime() - oldStart.getTime();
    const newStart = addDays(weekStart, dragState.dayIndex);
    const h = Math.floor(dragState.snapQuarter / 4);
    const m = (dragState.snapQuarter % 4) * 15;
    newStart.setHours(h, m, 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    setDragState(null);
    const r = await fetch(`/api/schedules/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert(err.error ?? "Failed to move schedule");
      return;
    }
    await load();
  }

  function onResizeStart(e: React.PointerEvent<HTMLDivElement>, row: ScheduleRow) {
    e.stopPropagation();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    const startDate = new Date(row.startTime);
    const endDate = new Date(row.endTime);
    const startIndex = Math.max(
      0,
      Math.min(6, Math.floor((startOfWeek(startDate).getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)))
    );
    const endIndex = Math.max(
      startIndex,
      Math.min(6, Math.floor((startOfWeek(endDate).getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)))
    );
    setResizeState({
      scheduleId: row.id,
      startDate,
      endDate,
      endDayIndex: endIndex,
      endQuarter: Math.round((endDate.getHours() * 60 + endDate.getMinutes()) / 15),
    });
  }

  function onResizeMove(clientX: number, clientY: number) {
    if (!resizeState) return;
    const point = pointerToDayQuarter(clientX, clientY);
    if (!point) return;
    setResizeState((prev) => {
      if (!prev) return prev;
      const startDay = Math.max(
        0,
        Math.min(6, Math.floor((startOfWeek(prev.startDate).getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)))
      );
      const startQuarter = Math.round((prev.startDate.getHours() * 60 + prev.startDate.getMinutes()) / 15);
      const clampedDay = Math.max(startDay, point.dayIndex);
      const clampedQuarter = clampedDay === startDay ? Math.max(startQuarter + 1, point.quarter) : point.quarter;
      return { ...prev, endDayIndex: clampedDay, endQuarter: Math.min(95, clampedQuarter) };
    });
  }

  async function onResizeEnd() {
    if (!resizeState) return;
    const row = schedules.find((s) => s.id === resizeState.scheduleId);
    if (!row) {
      setResizeState(null);
      return;
    }
    const start = new Date(row.startTime);
    const base = addDays(weekStart, resizeState.endDayIndex);
    const end = new Date(base);
    const h = Math.floor(resizeState.endQuarter / 4);
    const m = (resizeState.endQuarter % 4) * 15;
    end.setHours(h, m, 0, 0);
    if (end <= start) {
      end.setTime(start.getTime() + 15 * 60 * 1000);
    }
    setResizeState(null);
    const r = await fetch(`/api/schedules/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      alert(err.error ?? "Failed to resize schedule");
      return;
    }
    await load();
  }

  if (loading) {
    return <p className="text-slate-500">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <AdminBreadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: "Schedule" }]} />

      <div>
        <h1 className="font-gdl-display text-2xl font-bold uppercase tracking-wide text-slate-900 md:text-4xl">
          Schedule board
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Schedule either scene graphics or content assets on a weekly hour-by-hour timeline.
        </p>
        {loadError ? <p className="mt-2 text-sm text-red-600">{loadError}</p> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-gdl-display text-xs font-bold uppercase tracking-widest text-slate-500">
            Libraries
          </h2>
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scene library</p>
            <ul className="mt-2 max-h-56 space-y-1 overflow-auto pr-1">
              {scenes.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType("SCENE");
                      setSceneId(String(s.id));
                    }}
                    className={`w-full truncate rounded-lg px-2 py-2 text-left text-sm ${
                      selectedType === "SCENE" && sceneId === String(s.id)
                        ? "bg-[#52A88E]/20 font-semibold text-[#1f5f50]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {s.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Content library</p>
            <ul className="mt-2 max-h-72 space-y-1 overflow-auto pr-1">
              {assets.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType("CONTENT");
                      setAssetId(String(a.id));
                    }}
                    className={`w-full truncate rounded-lg px-2 py-2 text-left text-sm ${
                      selectedType === "CONTENT" && assetId === String(a.id)
                        ? "bg-[#52A88E]/20 font-semibold text-[#1f5f50]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    {a.name}
                    <span className="ml-2 text-[10px] text-slate-500">{a.mediaKind}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <div className="space-y-4">
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-lg bg-[#52A88E] px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] hover:bg-[#469178]"
            >
              Add item
            </button>
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <h2 className="font-gdl-display text-sm font-bold uppercase tracking-wide text-slate-700">
                Weekly grid
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => animateNav(addWeeks(weekStart, -1), "left")}
                  className="rounded border border-slate-200 px-2 py-1 text-sm transition hover:-translate-x-0.5 hover:bg-slate-50"
                  aria-label="Previous week"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => animateNav(addWeeks(weekStart, 1), "right")}
                  className="rounded border border-slate-200 px-2 py-1 text-sm transition hover:translate-x-0.5 hover:bg-slate-50"
                  aria-label="Next week"
                >
                  →
                </button>
                <button
                  type="button"
                  onClick={() => animateNav(startOfWeek(addMonths(weekStart, -1)), "left")}
                  className="rounded border border-slate-200 px-2 py-1 text-xs transition hover:-translate-x-0.5 hover:bg-slate-50"
                >
                  -Month
                </button>
                <button
                  type="button"
                  onClick={() => animateNav(startOfWeek(addMonths(weekStart, 1)), "right")}
                  className="rounded border border-slate-200 px-2 py-1 text-xs transition hover:translate-x-0.5 hover:bg-slate-50"
                >
                  +Month
                </button>
                <button
                  type="button"
                  onClick={() => animateNav(startOfWeek(addYears(weekStart, -1)), "left")}
                  className="rounded border border-slate-200 px-2 py-1 text-xs transition hover:-translate-x-0.5 hover:bg-slate-50"
                >
                  -Year
                </button>
                <button
                  type="button"
                  onClick={() => animateNav(startOfWeek(addYears(weekStart, 1)), "right")}
                  className="rounded border border-slate-200 px-2 py-1 text-xs transition hover:translate-x-0.5 hover:bg-slate-50"
                >
                  +Year
                </button>
              </div>
            </header>

            <div>
              <div
                key={`${animTick}-${weekStart.toISOString()}`}
                className={`w-full transition duration-300 ${
                  navDirection === "right" ? "animate-[fadeinright_.25s_ease-out]" : "animate-[fadeinleft_.25s_ease-out]"
                }`}
              >
                <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50">
                  <div className="px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Time
                  </div>
                  {weekDays.map((d) => (
                    <div
                      key={d.toISOString()}
                      className="border-l border-slate-200 px-2 py-2 text-center text-xs font-semibold text-slate-700"
                    >
                      <div>{d.toLocaleDateString(undefined, { weekday: "short" })}</div>
                      <div className="text-[11px] text-slate-500">
                        {d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="relative" ref={gridRef}>
                  <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
                    {Array.from({ length: 24 }, (_, hour) => (
                      <div key={`row-${hour}`} className="contents">
                        <div className="px-2 py-3 text-xs text-slate-500">
                          {quarterToLabel(hour * 4)}
                        </div>
                        {weekDays.map((d, idx) => (
                          <button
                            key={`${dayKey(d)}-${hour}-${idx}`}
                            type="button"
                            onClick={() => jumpToSlot(d, hour)}
                            className="h-12 border-l border-slate-100 text-left hover:bg-[#52A88E]/10"
                            aria-label={`Choose ${d.toDateString()} at ${quarterToLabel(hour * 4)}`}
                          />
                        ))}
                      </div>
                    ))}
                  </div>

                  <div className="absolute inset-0 grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
                    <div />
                    {weekDays.map((d, dayIndex) => {
                      const list = scheduleBlocksByDay.get(dayKey(d)) ?? [];
                      const lanes = [...new Set(list.map((l) => l.targetKey))];
                      return (
                        <div key={`overlay-${d.toISOString()}`} className="relative border-l border-transparent">
                          {list.map((row) => (
                            (() => {
                              const laneIndex = Math.max(0, lanes.indexOf(row.targetKey));
                              const laneCount = Math.max(1, lanes.length);
                              const gap = 4;
                              const widthPct = 100 / laneCount;
                              const leftPx = laneIndex * widthPct;
                              const className =
                                targetColorMap.get(row.targetKey) ?? "bg-slate-200/55 border-slate-400 text-slate-900";
                              const resizeActive = resizeState?.scheduleId === row.id;
                              const isResizeSegment = resizeActive && row.isEndSegment;
                              const segmentStartDate = new Date(row.segmentStartTime);
                              const segmentDefaultEnd = new Date(
                                segmentStartDate.getTime() + row.durationHours * 60 * 60 * 1000
                              );
                              const displayedEnd = isResizeSegment
                                ? (() => {
                                    const base = addDays(weekStart, resizeState.endDayIndex);
                                    const dt = new Date(base);
                                    dt.setHours(
                                      Math.floor(resizeState.endQuarter / 4),
                                      (resizeState.endQuarter % 4) * 15,
                                      0,
                                      0
                                    );
                                    return dt;
                                  })()
                                : segmentDefaultEnd;
                              return (
                                <div
                                  key={row.id}
                                  className={`absolute cursor-grab overflow-hidden rounded border p-1 text-[10px] shadow-sm active:cursor-grabbing ${className}`}
                                  style={{
                                    left: `calc(${leftPx}% + ${gap / 2}px)`,
                                    width: `calc(${widthPct}% - ${gap}px)`,
                                    top: `${
                                      dragState?.scheduleId === row.id
                                        ? dragState.snapQuarter * 12
                                        : row.startHour * 48
                                    }px`,
                                    height: `${
                                      isResizeSegment
                                        ? Math.max(
                                            24,
                                            (displayedEnd.getTime() - new Date(row.segmentStartTime).getTime()) /
                                              (1000 * 60 * 15) *
                                              12
                                          )
                                        : Math.max(row.durationHours * 48, 24)
                                    }px`,
                                  }}
                                  onPointerDown={(e) => onDragStart(e, row, dayIndex, row.durationHours)}
                                  onPointerMove={(e) => {
                                    if (dragState?.scheduleId === row.id) {
                                      updateDragFromPointer(
                                        e.clientX,
                                        e.clientY,
                                        dayIndex,
                                        row.durationHours,
                                        row.id
                                      );
                                    }
                                  }}
                                  onPointerUp={() => void onDragEnd(row)}
                                  onClick={() => {
                                    if (dragState?.scheduleId === row.id || resizeState?.scheduleId === row.id) return;
                                    openEditModal(row);
                                  }}
                                  title={row.scene.name}
                                >
                                  <p className="truncate font-semibold">{row.scene.name}</p>
                                  <p className="truncate text-[9px]">{row.targetLabel}</p>
                                  <p className="truncate text-[9px]">
                                    {segmentStartDate.toLocaleTimeString([], {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}{" "}
                                    -{" "}
                                    {displayedEnd.toLocaleTimeString([], {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}
                                  </p>
                                  {row.isEndSegment ? (
                                    <div
                                      className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-black/10"
                                      onPointerDown={(e) => onResizeStart(e, row)}
                                      onPointerMove={(e) => onResizeMove(e.clientX, e.clientY)}
                                      onPointerUp={() => void onResizeEnd()}
                                    />
                                  ) : null}
                                </div>
                              );
                            })()
                          ))}
                          {dragState && dragState.dayIndex === dayIndex ? (
                            <div
                              className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-[#1f5f50]"
                              style={{ top: `${dragState.snapQuarter * 12}px` }}
                            >
                              <span className="absolute -top-5 left-1 rounded bg-[#1f5f50] px-1.5 py-0.5 text-[10px] text-white">
                                {quarterToLabel(dragState.snapQuarter)}
                              </span>
                            </div>
                          ) : null}
                          {resizeState && resizeState.endDayIndex === dayIndex ? (
                            <div
                              className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-amber-600"
                              style={{ top: `${resizeState.endQuarter * 12}px` }}
                            >
                              <span className="absolute -top-5 left-1 rounded bg-amber-700 px-1.5 py-0.5 text-[10px] text-white">
                                Ends {quarterToLabel(resizeState.endQuarter)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-gdl-display text-lg font-bold uppercase tracking-wide text-slate-900">
                {modalMode === "CREATE" ? "Add schedule item" : "Schedule settings"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <form onSubmit={modalMode === "CREATE" ? createSchedule : saveEditSchedule} className="space-y-4">
              {modalMode === "CREATE" ? (
                <>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Schedule type
                      </label>
                      <div className="mt-2 flex gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="itemType"
                            checked={selectedType === "SCENE"}
                            onChange={() => setSelectedType("SCENE")}
                          />
                          Scene
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="itemType"
                            checked={selectedType === "CONTENT"}
                            onChange={() => setSelectedType("CONTENT")}
                          />
                          Content
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {selectedType === "SCENE" ? "Scene" : "Content asset"}
                      </label>
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={selectedType === "SCENE" ? sceneId : assetId}
                        onChange={(e) =>
                          selectedType === "SCENE" ? setSceneId(e.target.value) : setAssetId(e.target.value)
                        }
                        required
                      >
                        <option value="">Select {selectedType === "SCENE" ? "scene" : "content"}</option>
                        {selectedType === "SCENE"
                          ? scenes.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))
                          : assets.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Target</label>
                      <div className="mt-1 flex gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="target"
                            checked={targetMode === "TEAM"}
                            onChange={() => {
                              setTargetMode("TEAM");
                              setTargetGroupId("");
                            }}
                          />
                          Team
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="target"
                            checked={targetMode === "GROUP"}
                            onChange={() => setTargetMode("GROUP")}
                          />
                          Group
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Team</label>
                      <select
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        value={targetTeamId}
                        onChange={(e) => {
                          setTargetTeamId(e.target.value);
                          if (targetMode === "GROUP") setTargetGroupId("");
                        }}
                        required
                      >
                        <option value="">Select team</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {targetMode === "GROUP" ? (
                      <div>
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Group</label>
                        <select
                          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                          value={targetGroupId}
                          onChange={(e) => setTargetGroupId(e.target.value)}
                          required
                          disabled={!targetTeamId}
                        >
                          <option value="">Select group</option>
                          {groupsForTeam.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Start</label>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={startLocal}
                    onChange={(e) => setStartLocal(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-500">End</label>
                  <input
                    type="datetime-local"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={endLocal}
                    onChange={(e) => setEndLocal(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                {modalMode === "EDIT" && editingScheduleId != null ? (
                  <button
                    type="button"
                    onClick={() => void removeSchedule(editingScheduleId)}
                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    Delete item
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    {modalMode === "CREATE" ? "Create schedule" : "Save changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function addWeeks(date: Date, weeks: number) {
  return addDays(date, weeks * 7);
}
