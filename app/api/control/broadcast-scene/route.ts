import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { canUserControlTeam } from "@/lib/org-permissions";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const teamId = Number(body?.teamId);
  const sceneId = Number(body?.sceneId);

  if (!Number.isFinite(teamId) || !Number.isFinite(sceneId)) {
    return NextResponse.json({ error: "teamId and sceneId are required" }, { status: 400 });
  }

  const can = await canUserControlTeam(auth.session.user.id, teamId, auth.session.user.role);
  if (!can) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  if (scene.teamId != null && scene.teamId !== teamId) {
    return NextResponse.json(
      { error: "Scene does not belong to this team" },
      { status: 400 }
    );
  }

  const result = await prisma.display.updateMany({
    where: { teamId, isPaired: true },
    data: {
      overrideSceneId: sceneId,
      directMediaUrl: null,
      directMediaKind: null,
      directThemeColor: null,
    },
  });

  return NextResponse.json({ ok: true, updated: result.count });
}
