import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/require-session";
import { requireFolderContentAccess } from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existingAsset = await prisma.contentAsset.findUnique({
    where: { id },
    select: { folderId: true },
  });
  if (!existingAsset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existingAsset.folderId == null) {
    const ar = await requireAdmin();
    if (!ar.ok) return ar.response;
  } else {
    const e = await requireFolderContentAccess(auth.session, existingAsset.folderId);
    if (e instanceof NextResponse) return e;
  }

  const body = await req.json().catch(() => null);

  let name: string | undefined;
  if (body?.name !== undefined) {
    if (typeof body?.name !== "string") {
      return NextResponse.json({ error: "name must be a string" }, { status: 400 });
    }
    const t = body.name.trim();
    if (!t) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    name = t;
  }

  let folderId: number | null | undefined;
  if (body?.folderId !== undefined) {
    if (body.folderId === null || body.folderId === "") {
      folderId = null;
    } else {
      const fid = Number(body.folderId);
      if (!Number.isFinite(fid)) {
        return NextResponse.json({ error: "Invalid folderId" }, { status: 400 });
      }
      const folder = await prisma.contentFolder.findUnique({ where: { id: fid } });
      if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
      const fe = await requireFolderContentAccess(auth.session, fid);
      if (fe instanceof NextResponse) return fe;
      folderId = fid;
    }
  }

  if (name === undefined && folderId === undefined) {
    return NextResponse.json({ error: "Provide name and/or folderId" }, { status: 400 });
  }

  const data: { name?: string; folderId?: number | null } = {};
  if (name !== undefined) data.name = name;
  if (folderId !== undefined) data.folderId = folderId;

  try {
    const asset = await prisma.contentAsset.update({
      where: { id },
      data,
    });
    return NextResponse.json(asset);
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

  const existingAsset = await prisma.contentAsset.findUnique({
    where: { id },
    select: { folderId: true },
  });
  if (!existingAsset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existingAsset.folderId == null) {
    const ar = await requireAdmin();
    if (!ar.ok) return ar.response;
  } else {
    const e = await requireFolderContentAccess(auth.session, existingAsset.folderId);
    if (e instanceof NextResponse) return e;
  }

  try {
    await prisma.contentAsset.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
