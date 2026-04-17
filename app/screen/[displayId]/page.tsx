"use client";

import { SceneScreenView } from "@/components/scene/SceneScreenView";
import type { SceneLayoutState } from "@/lib/scene-layout";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "gameday_screen_pair_v1";

type LivePayload = {
  scene: {
    id: number;
    name: string;
    backgroundUrl: string;
    themeColor: string;
    mediaKind: string;
    layout: SceneLayoutState;
  };
  source: "direct" | "override" | "scheduled" | "default";
};

export default function ScreenLivePage() {
  const params = useParams();
  const router = useRouter();
  const displayId = params.displayId as string;
  const [data, setData] = useState<LivePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    const seg = String(displayId ?? "").trim();
    if (!seg) {
      setError("invalid");
      return;
    }
    try {
      const r = await fetch(
        `/api/displays/${encodeURIComponent(seg)}/current-scene`,
        { cache: "no-store" }
      );
      if (r.status === 409) {
        setError("not_registered");
        return;
      }
      if (r.status === 400) {
        setError("invalid");
        return;
      }
      if (r.status === 404) {
        setError("not_found");
        return;
      }
      if (!r.ok) {
        setError("not_found");
        return;
      }
      setError(null);
      setData(await r.json());
    } catch {
      setError("network");
    }
  }, [displayId]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    if (error !== "not_registered") return;
    const u = setTimeout(() => router.replace("/screen"), 2500);
    return () => clearTimeout(u);
  }, [error, router]);

  useEffect(() => {
    if (error !== "not_found") return;
    // The screen was deleted in admin, so forget the old saved code on this device.
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures; user can still pair again manually.
    }
    const u = setTimeout(() => router.replace("/screen"), 3500);
    return () => clearTimeout(u);
  }, [error, router]);

  if (error === "not_registered") {
    return (
      <div className="gdl-screen-root flex min-h-dvh flex-col items-center justify-center px-6 text-center text-[var(--gdl-text)]">
        <p className="font-gdl-display text-2xl font-semibold tracking-wide md:text-3xl">
          Screen not registered
        </p>
        <p className="mt-4 text-lg text-[var(--gdl-muted)]">Opening pairing…</p>
        <div className="gdl-gold-rule mt-10 w-48" />
      </div>
    );
  }

  if (error === "invalid") {
    return (
      <div className="gdl-screen-root flex min-h-dvh flex-col items-center justify-center px-6 text-center text-[var(--gdl-text)]">
        <p className="font-gdl-display text-xl font-medium">Invalid screen link</p>
        <p className="mt-3 max-w-md text-sm text-[var(--gdl-muted)]">
          Use the pairing code from this device (e.g. A2J4-F5E1) or a valid screen id from admin.
        </p>
        <Link
          href="/screen"
          className="mt-8 font-gdl-display text-lg tracking-wide text-[var(--gdl-gold-mid)] underline decoration-[var(--gdl-gold-dim)] underline-offset-4"
        >
          Start new screen
        </Link>
      </div>
    );
  }

  if (error === "network") {
    return (
      <div className="gdl-screen-root flex min-h-dvh flex-col items-center justify-center px-6 text-center text-[var(--gdl-text)]">
        <p className="font-gdl-display text-xl font-medium">Could not reach server</p>
        <p className="mt-3 text-sm text-[var(--gdl-muted)]">Check your connection and that this URL matches your Gameday Lockers site.</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            void poll();
          }}
          className="mt-8 font-gdl-display text-lg tracking-wide text-[var(--gdl-gold-mid)] underline decoration-[var(--gdl-gold-dim)] underline-offset-4"
        >
          Retry
        </button>
      </div>
    );
  }

  if (error === "not_found") {
    return (
      <div className="gdl-screen-root flex min-h-dvh flex-col items-center justify-center px-6 text-center text-[var(--gdl-text)]">
        <p className="font-gdl-display text-xl font-medium">Screen not found</p>
        <p className="mt-3 max-w-md text-sm text-[var(--gdl-muted)]">
          This screen may have been removed from admin. Opening pairing so this TV can register again from{" "}
          <span className="text-[var(--gdl-chrome)]">Start new screen</span>.
        </p>
        <Link
          href="/screen"
          className="mt-8 font-gdl-display text-lg tracking-wide text-[var(--gdl-gold-mid)] underline decoration-[var(--gdl-gold-dim)] underline-offset-4"
        >
          Start new screen
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="gdl-screen-root flex min-h-dvh items-center justify-center">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--gdl-border)]" />
          <div
            className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--gdl-gold)]"
            style={{ animationDuration: "1.1s" }}
          />
        </div>
      </div>
    );
  }

  const { scene } = data;

  return (
    <SceneScreenView scene={scene} fillViewport mediaOnly className="!rounded-none" />
  );
}
