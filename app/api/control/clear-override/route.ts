import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { canUserControlTeam } from "@/lib/org-permissions";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const teamId = Number(body?.teamId);

  if (!Number.isFinite(teamId)) {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }

  const can = await canUserControlTeam(auth.session.user.id, teamId, auth.session.user.role);
  if (!can) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await prisma.display.updateMany({
    where: { teamId, isPaired: true },
    data: {
      overrideSceneId: null,
      directMediaUrl: null,
      directMediaKind: null,
      directThemeColor: null,
    },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
