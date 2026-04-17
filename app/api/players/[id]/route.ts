import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { requireTeamContentAccess } from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);

  const firstName =
    typeof body?.firstName === "string" ? body.firstName.trim() : undefined;
  const lastName =
    typeof body?.lastName === "string" ? body.lastName.trim() : undefined;
  const number =
    typeof body?.number === "string"
      ? body.number.trim()
      : body?.number !== undefined
        ? String(body.number)
        : undefined;
  const position =
    typeof body?.position === "string" ? body.position.trim() : undefined;
  let imageUrl: string | null | undefined = undefined;
  if (body?.imageUrl !== undefined) {
    imageUrl =
      typeof body.imageUrl === "string" && body.imageUrl.trim()
        ? body.imageUrl.trim()
        : null;
  }
  const teamId = body?.teamId !== undefined ? Number(body.teamId) : undefined;
  const groupId = body?.groupId !== undefined ? Number(body.groupId) : undefined;

  const data: Record<string, unknown> = {};
  if (firstName !== undefined) data.firstName = firstName;
  if (lastName !== undefined) data.lastName = lastName;
  if (number !== undefined) data.number = number;
  if (position !== undefined) data.position = position;
  if (imageUrl !== undefined) data.imageUrl = imageUrl;
  if (teamId !== undefined) data.teamId = teamId;
  if (groupId !== undefined) data.groupId = groupId;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const existing = await prisma.player.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const c0 = await requireTeamContentAccess(auth.session, existing.teamId);
  if (c0) return c0;

  const nextTeamId = (data.teamId as number) ?? existing.teamId;
  const nextGroupId = (data.groupId as number) ?? existing.groupId;
  const group = await prisma.group.findFirst({
    where: { id: nextGroupId, teamId: nextTeamId },
  });
  if (!group) {
    return NextResponse.json(
      { error: "Group must belong to the selected team" },
      { status: 400 }
    );
  }
  const c1 = await requireTeamContentAccess(auth.session, nextTeamId);
  if (c1) return c1;

  try {
    const player = await prisma.player.update({
      where: { id },
      data,
      include: { team: true, group: true },
    });
    return NextResponse.json(player);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const existing = await prisma.player.findUnique({ where: { id }, select: { teamId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const c = await requireTeamContentAccess(auth.session, existing.teamId);
  if (c) return c;
  try {
    await prisma.player.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
