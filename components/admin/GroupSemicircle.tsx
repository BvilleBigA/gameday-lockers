"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type WallTile = {
  id: number;
  label: string | null;
  live: {
    sceneName: string;
    backgroundUrl: string;
    mediaKind: string;
    themeColor: string;
    source: string;
  } | null;
  status: string;
};

const STAGE_BASE_W = 1024;
const STAGE_BASE_H = 300;

export function GroupSemicircle({ groupId }: { groupId: number }) {
  const [tiles, setTiles] = useState<WallTile[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [stageScale, setStageScale] = useState(1);
  const measureRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/groups/${groupId}/wall`, { credentials: "include" });
    if (!r.ok) {
      setErr("Could not load wall");
      return;
    }
    setErr(null);
    const j = (await r.json()) as { displays: WallTile[] };
    setTiles(j.displays ?? []);
  }, [groupId]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  const n = tiles.length;
  const radius = Math.min(380, 140 + n * 26);
  const arc = Math.PI * 0.9;

  useEffect(() => {
    if (n === 0) return;
    const el = measureRef.current;
    if (!el) return;
    const apply = () => setStageScale(Math.min(1, el.clientWidth / STAGE_BASE_W));
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [n]);

  if (err) {
    return <p className="text-center text-red-600">{err}</p>;
  }

  return (
    <div className="relative mx-auto w-full max-w-6xl py-6 [perspective:1600px]">
      <div
        ref={measureRef}
        className="relative mx-auto w-full overflow-x-hidden"
        style={{
          minHeight: n === 0 ? 280 : STAGE_BASE_H * stageScale + 40,
        }}
      >
        {n === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center px-4 py-8 text-center">
            <p className="text-slate-600">No paired screens are assigned to this group yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Register codes on <span className="font-semibold text-[#3d7d6c]">Add screens</span> and
              assign each display to this group in its settings.
            </p>
          </div>
        ) : (
          <div
            className="absolute bottom-10 left-1/2 [transform-style:preserve-3d]"
            style={{
              width: STAGE_BASE_W,
              height: STAGE_BASE_H,
              transform: `translateX(-50%) rotateX(16deg) scale(${stageScale})`,
              transformOrigin: "center bottom",
            }}
          >
            {tiles.map((d, i) => {
              const t = n === 1 ? 0.5 : i / (n - 1);
              const angle = -arc / 2 + t * arc;
              const x = Math.sin(angle) * radius;
              const z = (1 - Math.cos(angle)) * radius * 0.45;
              const rotY = ((-angle * 180) / Math.PI) * 0.52;
              const live = d.live;

              return (
                <Link
                  key={d.id}
                  href={`/admin/displays/${d.id}?fromGroup=${groupId}`}
                  className="absolute left-1/2 top-[42%] block w-[min(220px,42vw)] max-w-[220px] origin-center -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d] outline-none transition duration-200 hover:z-10 hover:scale-[1.06] focus-visible:ring-2 focus-visible:ring-[#52A88E]"
                  style={{
                    transform: `translateX(${x}px) translateZ(${-z}px) rotateY(${rotY}deg)`,
                  }}
                >
                  <div className="overflow-hidden rounded-xl border border-slate-500/80 bg-slate-950 shadow-[0_20px_50px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
                    <div className="relative aspect-video bg-black">
                      {live ? (
                        live.mediaKind === "VIDEO" ? (
                          <video
                            key={live.backgroundUrl}
                            className="h-full w-full object-contain object-center"
                            src={live.backgroundUrl}
                            muted
                            playsInline
                            loop
                            autoPlay
                            preload="metadata"
                          />
                        ) : (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element -- live feed URLs */}
                            <img
                              src={live.backgroundUrl}
                              alt=""
                              className="absolute inset-0 z-0 h-full w-full object-contain object-center"
                            />
                            <div
                              className="pointer-events-none absolute inset-0 z-[1]"
                              style={{
                                background: `linear-gradient(145deg, ${live.themeColor}66, transparent 50%)`,
                              }}
                            />
                          </>
                        )
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-1 bg-slate-900 px-2 text-center">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {d.status === "not_registered" ? "Not registered" : "No feed"}
                          </span>
                        </div>
                      )}
                      <div className="pointer-events-none absolute left-2 top-2 rounded bg-black/65 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#7dccb4] backdrop-blur-sm">
                        {live?.source ?? "—"}
                      </div>
                    </div>
                    <div className="border-t border-slate-800 bg-slate-900/95 px-3 py-2.5">
                      <p className="truncate font-gdl-display text-sm font-bold uppercase tracking-wide text-white">
                        {d.label ?? `Screen ${d.id}`}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[#7dccb4]">
                        {live?.sceneName ?? "Nothing live"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
