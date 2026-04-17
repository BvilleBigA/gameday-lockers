import { prisma } from "@/lib/prisma";
import { normalizePairingCode } from "@/lib/pairing-code";

/**
 * TV URLs use `/screen/:segment` where segment is either a numeric display id or a pairing code
 * (XXXX-XXXX). Pure-digit strings try id first, then pairing code if no row matches that id.
 */
export async function resolveDisplayIdFromRouteSegment(raw: string): Promise<number | null> {
  const s = decodeURIComponent(raw ?? "").trim();
  if (!s) return null;

  if (/^\d+$/.test(s)) {
    const id = parseInt(s, 10);
    if (id > 0) {
      const byId = await prisma.display.findUnique({ where: { id }, select: { id: true } });
      if (byId) return byId.id;
    }
    const asCode = normalizePairingCode(s);
    if (asCode) {
      const byCode = await prisma.display.findUnique({
        where: { pairingCode: asCode },
        select: { id: true },
      });
      if (byCode) return byCode.id;
    }
    return null;
  }

  const code = normalizePairingCode(s);
  if (!code) return null;
  const row = await prisma.display.findUnique({
    where: { pairingCode: code },
    select: { id: true },
  });
  return row?.id ?? null;
}
