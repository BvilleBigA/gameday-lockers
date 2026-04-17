import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { isPlatformAdmin, requireFolderContentAccess } from "@/lib/org-permissions";

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  let parentId: number | null = null;
  if (body?.parentId !== undefined && body?.parentId !== null && body?.parentId !== "") {
    const p = Number(body.parentId);
    if (!Number.isFinite(p)) {
      return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
    }
    const parent = await prisma.contentFolder.findUnique({ where: { id: p } });
    if (!parent) return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    const err = await requireFolderContentAccess(auth.session, p);
    if (err instanceof NextResponse) return err;
    parentId = p;
  } else if (!isPlatformAdmin(auth.session.user.role)) {
    return NextResponse.json(
      { error: "parentId is required (only platform admins can create root folders)" },
      { status: 403 }
    );
  }

  const folder = await prisma.contentFolder.create({
    data: { name, parentId },
  });
  return NextResponse.json(folder, { status: 201 });
}
