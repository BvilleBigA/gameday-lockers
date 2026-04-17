import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { requireGroupContentAccess } from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const gErr = await requireGroupContentAccess(auth.session, id);
  if (gErr instanceof NextResponse) return gErr;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  if (name === undefined || !name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  try {
    const group = await prisma.$transaction(async (tx) => {
      const g = await tx.group.update({ where: { id }, data: { name } });
      await tx.contentFolder.updateMany({
        where: { groupId: id },
        data: { name },
      });
      return g;
    });
    return NextResponse.json(group);
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
  const gErr = await requireGroupContentAccess(auth.session, id);
  if (gErr instanceof NextResponse) return gErr;

  try {
    await prisma.group.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
