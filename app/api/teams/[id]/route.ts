import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { getTeamInScope, requireTeamContentAccess } from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const team = await getTeamInScope(id, auth.session.user.id, auth.session.user.role);
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const full = await prisma.team.findUnique({
    where: { id },
    include: {
      groups: { orderBy: { name: "asc" } },
      organization: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(full);
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const contentErr = await requireTeamContentAccess(auth.session, id);
  if (contentErr) return contentErr;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  if (name === undefined || !name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  try {
    const team = await prisma.team.update({ where: { id }, data: { name } });
    return NextResponse.json(team);
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

  const contentErr = await requireTeamContentAccess(auth.session, id);
  if (contentErr) return contentErr;

  try {
    await prisma.team.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
