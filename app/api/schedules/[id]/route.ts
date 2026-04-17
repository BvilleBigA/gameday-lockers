import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { isPlatformAdmin, requireTeamContentAccess } from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const sch = await prisma.schedule.findUnique({
    where: { id },
    include: { scene: { select: { teamId: true } } },
  });
  if (!sch?.scene) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (sch.scene.teamId == null) {
    if (!isPlatformAdmin(auth.session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const c = await requireTeamContentAccess(auth.session, sch.scene.teamId);
    if (c) return c;
  }
  try {
    await prisma.schedule.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const sch = await prisma.schedule.findUnique({
    where: { id },
    include: { scene: { select: { teamId: true } } },
  });
  if (!sch?.scene) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (sch.scene.teamId == null) {
    if (!isPlatformAdmin(auth.session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const c = await requireTeamContentAccess(auth.session, sch.scene.teamId);
    if (c) return c;
  }

  const body = await req.json().catch(() => null);
  const startTime = body?.startTime ? new Date(body.startTime) : null;
  const endTime = body?.endTime ? new Date(body.endTime) : null;

  if (!startTime || !endTime) {
    return NextResponse.json({ error: "startTime and endTime are required" }, { status: 400 });
  }
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }
  if (endTime <= startTime) {
    return NextResponse.json({ error: "endTime must be after startTime" }, { status: 400 });
  }

  const updated = await prisma.schedule.update({
    where: { id },
    data: { startTime, endTime },
    include: { scene: true },
  });
  return NextResponse.json(updated);
}
