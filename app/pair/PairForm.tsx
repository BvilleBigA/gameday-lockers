"use client";

import { normalizePairingCode } from "@/lib/pairing-code";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Team = { id: number; name: string };

export function PairForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [codeInput, setCodeInput] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = searchParams.get("code");
    if (q) setCodeInput(q.toUpperCase());
  }, [searchParams]);

  useEffect(() => {
    fetch("/api/teams")
      .then((r) => r.json())
      .then(setTeams);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const normalized = normalizePairingCode(codeInput);
    if (!normalized) {
      setMsg("Enter a valid 8-character code (e.g. A2J4-F5E1).");
      return;
    }
    const tid = Number(teamId);
    if (!Number.isFinite(tid)) {
      setMsg("Select a team.");
      return;
    }
    setBusy(true);
    const r = await fetch("/api/displays/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: normalized,
        teamId: tid,
        namePrefix: "Screen",
        startNumber: 1,
      }),
    });
    const data = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setMsg(data.error ?? "Registration failed");
      return;
    }
    if (normalized) {
      router.push(`/screen/${encodeURIComponent(normalized)}`);
    } else {
      setMsg("Registered but could not open screen URL.");
    }
  }

  return (
    <div className="gdl-nameplate-outer mx-auto max-w-md rounded-lg border border-[var(--gdl-border)] bg-[var(--gdl-panel)] p-8">
      <p className="font-gdl-display text-[10px] font-semibold uppercase tracking-[0.45em] text-[var(--gdl-gold)]">
        Gameday Lockers
      </p>
      <h1 className="font-gdl-display mt-2 text-2xl font-bold uppercase tracking-wide text-[var(--gdl-text)]">
        Register screen
      </h1>
      <div className="gdl-gold-rule mt-4 w-16" />
      <p className="mt-4 text-sm leading-relaxed text-[var(--gdl-muted)]">
        Same flow as{" "}
        <a href="/admin/displays" className="font-medium text-[var(--gdl-gold-mid)] underline decoration-[var(--gdl-gold-dim)]">
          Displays → Add screens
        </a>
        . Codes are only stored when you submit.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="font-gdl-display text-xs font-semibold uppercase tracking-wider text-[var(--gdl-muted)]">
            Code from screen
          </label>
          <input
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="mt-2 w-full rounded-lg border border-[var(--gdl-border)] bg-[var(--gdl-deep)] px-3 py-3 text-center font-mono text-2xl tracking-widest text-[var(--gdl-text)] outline-none ring-[var(--gdl-gold-dim)] focus:ring-2"
            placeholder="A2J4-F5E1"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <label className="font-gdl-display text-xs font-semibold uppercase tracking-wider text-[var(--gdl-muted)]">
            Team
          </label>
          <select
            className="mt-2 w-full rounded-lg border border-[var(--gdl-border)] bg-[var(--gdl-deep)] px-3 py-3 text-base text-[var(--gdl-text)]"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
          >
            <option value="">Select team</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        {msg && <p className="text-sm text-red-400">{msg}</p>}
        <button
          type="submit"
          disabled={busy}
          className="font-gdl-display w-full rounded-lg border border-[var(--gdl-gold-dim)] bg-[rgba(196,160,82,0.15)] py-3 text-sm font-bold uppercase tracking-widest text-[var(--gdl-gold-mid)] disabled:opacity-50"
        >
          {busy ? "Saving…" : "Register"}
        </button>
      </form>
    </div>
  );
}
