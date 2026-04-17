import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDefaultTeamId } from "@/lib/default-team";
import { requireAuth } from "@/lib/require-session";
import { listAccessibleTeamIds, requireTeamAccess, requireTeamContentAccess } from "@/lib/org-permissions";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const teamIdParam = searchParams.get("teamId");

  const where: Prisma.SceneWhereInput = {};
  if (teamIdParam !== null && teamIdParam !== "") {
    const tid = Number(teamIdParam);
    if (!Number.isFinite(tid)) {
      return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
    }
    const teamErr = await requireTeamAccess(auth.session, tid);
    if (teamErr) return teamErr;
    where.teamId = tid;
  } else {
    const ids = await listAccessibleTeamIds(auth.session.user.id, auth.session.user.role);
    if (ids !== "all") {
      where.teamId = { in: ids.length ? ids : [-1] };
    }
  }

  const scenes = await prisma.scene.findMany({
    where,
    orderBy: { name: "asc" },
    include: { team: true },
  });
  return NextResponse.json(scenes);
}

/** Create a facility Scene row (graphics / schedules). Wall layouts per TV live under Groups → wall scenes. */
export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  let teamId = Number(body?.teamId);
  if (!Number.isFinite(teamId)) {
    teamId = await getDefaultTeamId();
  } else {
    const teamErr = await requireTeamAccess(auth.session, teamId);
    if (teamErr) return teamErr;
  }

  const contentErr = await requireTeamContentAccess(auth.session, teamId);
  if (contentErr) return contentErr;

  const backgroundUrl =
    typeof body?.backgroundUrl === "string" && body.backgroundUrl.trim()
      ? body.backgroundUrl.trim()
      : "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1920&q=80";
  const themeColor =
    typeof body?.themeColor === "string" && body.themeColor.trim()
      ? body.themeColor.trim()
      : "#1e293b";
  const mediaKind =
    typeof body?.mediaKind === "string" && ["URL", "IMAGE", "VIDEO"].includes(body.mediaKind)
      ? body.mediaKind
      : "IMAGE";

  const scene = await prisma.scene.create({
    data: {
      name,
      teamId,
      backgroundUrl,
      themeColor,
      mediaKind,
    },
    include: { team: true },
  });
  return NextResponse.json(scene, { status: 201 });
}
