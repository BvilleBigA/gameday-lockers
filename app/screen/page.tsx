"use client";

import { generatePairingCode, normalizePairingCode } from "@/lib/pairing-code";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "gameday_screen_pair_v1";
const DEFAULT_ADMIN_ORIGIN = "https://lockers.bvillebiga.com";

export default function ScreenBootPage() {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const adminBase = (process.env.NEXT_PUBLIC_ADMIN_URL || "").replace(/\/$/, "");
  const origin =
    typeof window !== "undefined"
      ? adminBase || window.location.origin
      : adminBase;

  const initCode = useCallback(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const normalized = stored ? normalizePairingCode(stored) : null;
    if (normalized) {
      setCode(normalized);
    } else {
      const fresh = generatePairingCode();
      localStorage.setItem(STORAGE_KEY, fresh);
      setCode(fresh);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    initCode();
  }, [initCode]);

  function regenerateCode() {
    localStorage.removeItem(STORAGE_KEY);
    const fresh = generatePairingCode();
    localStorage.setItem(STORAGE_KEY, fresh);
    setCode(fresh);
  }

  useEffect(() => {
    if (!code || !ready) return;
    const poll = async () => {
      const r = await fetch(`/api/displays/check?code=${encodeURIComponent(code)}`);
      if (!r.ok) return;
      const data = await r.json();
      if (data.registered && code) {
        router.replace(`/screen/${encodeURIComponent(code)}`);
      }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [code, ready, router]);

  if (!ready || !code) {
    return (
      <div className="gdl-screen-root flex min-h-dvh flex-col items-center justify-center gap-6 text-[var(--gdl-muted)]">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--gdl-border)]" />
          <div
            className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--gdl-gold)]"
            style={{ animationDuration: "1.1s" }}
          />
        </div>
        <p className="font-gdl-display text-sm uppercase tracking-[0.35em]">Preparing</p>
      </div>
    );
  }

  const registerUrl = `${origin || DEFAULT_ADMIN_ORIGIN}/admin/displays?code=${encodeURIComponent(code)}`;

  return (
    <div className="gdl-screen-root flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-12 text-[var(--gdl-text)]">
      <div className="text-center">
        <p className="font-gdl-display text-xs font-semibold uppercase tracking-[0.55em] text-[var(--gdl-muted)]">
          Elevate the locker room
        </p>
        <p className="font-gdl-display mt-3 text-3xl font-bold tracking-[0.28em] text-[var(--gdl-chrome)] md:text-4xl">
          Gameday Lockers
        </p>
        <div className="gdl-gold-rule mx-auto mt-6 w-32" />
      </div>

      <p className="max-w-lg text-center font-gdl-display text-sm font-medium uppercase tracking-[0.2em] text-[var(--gdl-muted)] md:text-base">
        Add this code in admin — nothing is saved until you register
      </p>

      <p className="font-mono text-center text-[clamp(2.75rem,14vw,8rem)] font-bold leading-none tracking-[0.12em] text-[var(--gdl-text)] drop-shadow-[0_0_40px_rgba(196,160,82,0.25)]">
        {code}
      </p>

      <button
        type="button"
        onClick={regenerateCode}
        className="font-gdl-display text-xs font-semibold uppercase tracking-widest text-[var(--gdl-gold-mid)] underline decoration-[var(--gdl-gold-dim)] underline-offset-4"
      >
        New code
      </button>

      <div className="gdl-nameplate-outer rounded-lg bg-[var(--gdl-panel)] p-6 md:p-8">
        <div className="rounded-md bg-white p-4">
          <QRCodeSVG value={registerUrl} size={220} level="M" />
        </div>
      </div>

      <p className="max-w-xl text-center text-sm leading-relaxed text-[var(--gdl-muted)] md:text-base">
        <span className="text-[var(--gdl-chrome)]">Admin → Displays → Add screens</span> — paste the code and
        choose a team. Codes stay off the server until then.
      </p>
    </div>
  );
}
