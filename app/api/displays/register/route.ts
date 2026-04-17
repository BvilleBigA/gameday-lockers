import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePairingCode, parseCodesFromText } from "@/lib/pairing-code";

type Created = { code: string; displayId: number; label: string | null };
type Err = { code: string; error: string };

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const groupIdRaw = body?.groupId;
  let teamId = Number(body?.teamId);
  let groupId: number | null = null;

  if (groupIdRaw !== undefined && groupIdRaw !== null && groupIdRaw !== "") {
    const gid = Number(groupIdRaw);
    if (!Number.isFinite(gid)) {
      return NextResponse.json({ error: "Invalid groupId" }, { status: 400 });
    }
    const group = await prisma.group.findUnique({ where: { id: gid } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    groupId = gid;
    teamId = group.teamId;
  }

  if (!Number.isFinite(teamId)) {
    return NextResponse.json({ error: "teamId or groupId is required" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const namePrefix =
    typeof body?.namePrefix === "string" && body.namePrefix.trim()
      ? body.namePrefix.trim()
      : "Display";
  let startNumber = Number(body?.startNumber);
  if (!Number.isFinite(startNumber) || startNumber < 1) {
    startNumber = 1;
  }

  let rawCodes: string[] = [];
  if (Array.isArray(body?.codes)) {
    rawCodes = body.codes.filter((c: unknown) => typeof c === "string") as string[];
  } else if (typeof body?.codes === "string") {
    rawCodes = parseCodesFromText(body.codes);
  } else if (typeof body?.code === "string") {
    rawCodes = [body.code];
  }

  if (rawCodes.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one code (code string or codes text/array)" },
      { status: 400 }
    );
  }

  const normalized: string[] = [];
  const invalid: Err[] = [];
  const seen = new Set<string>();

  for (const token of rawCodes) {
    const n = normalizePairingCode(token);
    if (!n) {
      invalid.push({ code: String(token).slice(0, 12), error: "Invalid format (need 8 letters/numbers)" });
      continue;
    }
    if (seen.has(n)) {
      invalid.push({ code: n, error: "Duplicate in this request" });
      continue;
    }
    seen.add(n);
    normalized.push(n);
  }

  if (normalized.length === 0) {
    return NextResponse.json(
      { error: "No valid codes", invalid },
      { status: 400 }
    );
  }

  const created: Created[] = [];
  const errors: Err[] = [...invalid];
  let nextNum = startNumber;

  for (const pairingCode of normalized) {
    const existing = await prisma.display.findUnique({ where: { pairingCode } });
    if (existing) {
      errors.push({ code: pairingCode, error: "Already registered" });
      continue;
    }

    try {
      const label = `${namePrefix}-${nextNum}`;
      const display = await prisma.display.create({
        data: {
          pairingCode,
          label,
          isPaired: true,
          teamId,
          groupId,
          playerId: null,
          overrideSceneId: null,
        },
      });
      nextNum += 1;
      created.push({ code: pairingCode, displayId: display.id, label });
    } catch {
      errors.push({ code: pairingCode, error: "Could not save" });
    }
  }

  if (created.length === 0) {
    return NextResponse.json(
      { error: "No screens were added", errors },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    created,
    errors: errors.length ? errors : undefined,
    firstDisplayId: created[0]!.displayId,
  });
}
