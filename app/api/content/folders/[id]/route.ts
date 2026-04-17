import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { requireFolderContentAccess } from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const acc = await requireFolderContentAccess(auth.session, id);
  if (acc instanceof NextResponse) return acc;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const existing = await prisma.contentFolder.findUnique({ where: { id } });
  if (existing?.groupId != null) {
    return NextResponse.json(
      { error: "Rename screen-group folders from Groups (name stays in sync)." },
      { status: 400 }
    );
  }

  try {
    const folder = await prisma.contentFolder.update({
      where: { id },
      data: { name },
    });
    return NextResponse.json(folder);
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
  const acc = await requireFolderContentAccess(auth.session, id);
  if (acc instanceof NextResponse) return acc;

  const existing = await prisma.contentFolder.findUnique({ where: { id } });
  if (existing?.groupId != null) {
    return NextResponse.json(
      { error: "Delete the screen group to remove its library folder." },
      { status: 400 }
    );
  }

  try {
    await prisma.contentFolder.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
