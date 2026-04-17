import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { listAccessibleTeamIds, requireTeamContentAccess } from "@/lib/org-permissions";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const ids = await listAccessibleTeamIds(auth.session.user.id, auth.session.user.role);
  let where: Prisma.ScheduleWhereInput | undefined;
  if (ids !== "all") {
    const tid = ids.length ? ids : [-1];
    const groups = await prisma.group.findMany({
      where: { teamId: { in: tid } },
      select: { id: true },
    });
    const gids = groups.map((g) => g.id);
    where = {
      OR: [
        { scene: { teamId: { in: tid } } },
        { AND: [{ targetType: "TEAM" }, { targetId: { in: tid } }] },
        ...(gids.length ? [{ AND: [{ targetType: "GROUP" }, { targetId: { in: gids } }] }] : []),
      ],
    };
  }

  const schedules = await prisma.schedule.findMany({
    where,
    orderBy: { startTime: "desc" },
    include: { scene: true },
  });

  const enriched = await Promise.all(
    schedules.map(async (s) => {
      let targetLabel = "Unknown";
      if (s.targetType === "TEAM") {
        const team = await prisma.team.findUnique({ where: { id: s.targetId } });
        targetLabel = team ? `${team.name} (Team)` : targetLabel;
      } else if (s.targetType === "GROUP") {
        const group = await prisma.group.findUnique({
          where: { id: s.targetId },
          include: { team: true },
        });
        targetLabel = group ? `${group.team.name} / ${group.name}` : targetLabel;
      }
      return { ...s, targetLabel };
    })
  );

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const sceneId = Number(body?.sceneId);
  const targetType = typeof body?.targetType === "string" ? body.targetType.toUpperCase() : "";
  const targetId = Number(body?.targetId);
  const startTime = body?.startTime ? new Date(body.startTime) : null;
  const endTime = body?.endTime ? new Date(body.endTime) : null;

  if (!Number.isFinite(sceneId) || !Number.isFinite(targetId) || !startTime || !endTime) {
    return NextResponse.json(
      { error: "sceneId, targetType, targetId, startTime, endTime are required" },
      { status: 400 }
    );
  }

  if (targetType !== "TEAM" && targetType !== "GROUP") {
    return NextResponse.json({ error: "targetType must be TEAM or GROUP" }, { status: 400 });
  }

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  if (endTime <= startTime) {
    return NextResponse.json({ error: "endTime must be after startTime" }, { status: 400 });
  }

  let targetTeamId: number;
  if (targetType === "TEAM") {
    const team = await prisma.team.findUnique({ where: { id: targetId } });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
    targetTeamId = team.id;
  } else {
    const group = await prisma.group.findUnique({ where: { id: targetId } });
    if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    targetTeamId = group.teamId;
  }

  const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
  if (!scene) return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  if (scene.teamId == null || scene.teamId !== targetTeamId) {
    return NextResponse.json(
      { error: "Scene must belong to the same team as the schedule target" },
      { status: 400 }
    );
  }

  const contentErr = await requireTeamContentAccess(auth.session, targetTeamId);
  if (contentErr) return contentErr;

  const schedule = await prisma.schedule.create({
    data: {
      sceneId,
      targetType,
      targetId,
      startTime,
      endTime,
    },
    include: { scene: true },
  });
  return NextResponse.json(schedule, { status: 201 });
}
