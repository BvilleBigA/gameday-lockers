import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { listAccessibleTeamIds, requireTeamAccess, requireTeamContentAccess } from "@/lib/org-permissions";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const teamIdParam = searchParams.get("teamId");
  const ids = await listAccessibleTeamIds(auth.session.user.id, auth.session.user.role);

  const where: Prisma.PlayerWhereInput = {};
  if (teamIdParam) {
    const tid = Number(teamIdParam);
    if (!Number.isFinite(tid)) {
      return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
    }
    const err = await requireTeamAccess(auth.session, tid);
    if (err) return err;
    where.teamId = tid;
  } else if (ids !== "all") {
    where.teamId = { in: ids.length ? ids : [-1] };
  }

  const players = await prisma.player.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { team: true, group: true },
  });
  return NextResponse.json(players);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const firstName = typeof body?.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body?.lastName === "string" ? body.lastName.trim() : "";
  const number = typeof body?.number === "string" ? body.number.trim() : String(body?.number ?? "");
  const position = typeof body?.position === "string" ? body.position.trim() : "";
  const imageUrl =
    typeof body?.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;
  const teamId = Number(body?.teamId);
  const groupId = Number(body?.groupId);

  if (!firstName || !lastName || !number || !position || !Number.isFinite(teamId) || !Number.isFinite(groupId)) {
    return NextResponse.json(
      { error: "firstName, lastName, number, position, teamId, groupId are required" },
      { status: 400 }
    );
  }

  const contentErr = await requireTeamContentAccess(auth.session, teamId);
  if (contentErr) return contentErr;

  const group = await prisma.group.findFirst({ where: { id: groupId, teamId } });
  if (!group) {
    return NextResponse.json({ error: "Group must belong to the selected team" }, { status: 400 });
  }

  const player = await prisma.player.create({
    data: {
      firstName,
      lastName,
      number,
      position,
      imageUrl,
      teamId,
      groupId,
    },
    include: { team: true, group: true },
  });
  return NextResponse.json(player, { status: 201 });
}
