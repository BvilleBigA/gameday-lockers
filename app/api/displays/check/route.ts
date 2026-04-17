import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePairingCode } from "@/lib/pairing-code";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("code") ?? "";
  const code = normalizePairingCode(raw);

  if (!code) {
    return NextResponse.json({ error: "Invalid code format (use 8 characters, e.g. A2J4-F5E1)" }, { status: 400 });
  }

  const display = await prisma.display.findUnique({
    where: { pairingCode: code },
    select: { id: true, isPaired: true, teamId: true },
  });

  if (!display || !display.isPaired || display.teamId == null) {
    return NextResponse.json({ registered: false });
  }

  return NextResponse.json({ registered: true, displayId: display.id });
}
