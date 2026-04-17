import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generatePairingCode } from "@/lib/pairing-code";

export async function POST() {
  for (let i = 0; i < 8; i++) {
    const code = generatePairingCode();
    const existing = await prisma.display.findUnique({ where: { pairingCode: code } });
    if (existing) continue;
    const display = await prisma.display.create({
      data: {
        pairingCode: code,
        isPaired: false,
        label: null,
      },
      select: { id: true, pairingCode: true },
    });
    return NextResponse.json({ ok: true, code: display.pairingCode, displayId: display.id });
  }

  return NextResponse.json({ error: "Could not allocate pairing code" }, { status: 503 });
}
