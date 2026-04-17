/** 8 alphanumeric chars as XXXX-XXXX (e.g. A2J4-F5E1). No DB row until admin registers. */

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generatePairingCode(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += CHARSET[bytes[i]! % CHARSET.length]!;
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`;
}

/** Returns canonical XXXX-XXXX or null if invalid. */
export function normalizePairingCode(input: string): string | null {
  const alnum = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (alnum.length !== 8) return null;
  if (!/^[A-Z0-9]{8}$/.test(alnum)) return null;
  return `${alnum.slice(0, 4)}-${alnum.slice(4)}`;
}

export function parseCodesFromText(text: string): string[] {
  const parts = text.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const n = normalizePairingCode(p);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}
