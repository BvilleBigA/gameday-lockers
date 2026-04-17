import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import {
  isPlatformAdmin,
  listAccessibleTeamIds,
  requireFolderContentAccess,
} from "@/lib/org-permissions";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const where: Prisma.ContentAssetWhereInput = {};
  if (!isPlatformAdmin(auth.session.user.role)) {
    const ids = await listAccessibleTeamIds(auth.session.user.id, auth.session.user.role);
    const teamIds = ids === "all" ? [] : ids;
    where.folder = {
      group: {
        teamId: {
          in: teamIds.length ? teamIds : [-1],
        },
      },
    };
  }

  const assets = await prisma.contentAsset.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      name: true,
      url: true,
      mediaKind: true,
      createdAt: true,
      folderId: true,
    },
  });

  return NextResponse.json(assets);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const mediaKind =
    body?.mediaKind === "VIDEO" || body?.mediaKind === "IMAGE" ? body.mediaKind : "IMAGE";

  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }
  const displayName = name || url.split("/").pop() || "Untitled";

  let folderId: number | null = null;
  if (body?.folderId !== undefined && body?.folderId !== null && body?.folderId !== "") {
    const fid = Number(body.folderId);
    if (!Number.isFinite(fid)) {
      return NextResponse.json({ error: "Invalid folderId" }, { status: 400 });
    }
    const folder = await prisma.contentFolder.findUnique({ where: { id: fid } });
    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    folderId = fid;
  }

  const displayIdRaw = body?.displayId;
  if (displayIdRaw !== undefined && displayIdRaw !== null && displayIdRaw !== "") {
    const did = Number(displayIdRaw);
    if (!Number.isFinite(did)) {
      return NextResponse.json({ error: "Invalid displayId" }, { status: 400 });
    }
    const display = await prisma.display.findUnique({
      where: { id: did },
      include: { group: { include: { contentFolder: { select: { id: true } } } } },
    });
    if (!display) return NextResponse.json({ error: "Display not found" }, { status: 404 });
    const groupFolderId = display.group?.contentFolder?.id;
    if (groupFolderId != null) {
      folderId = groupFolderId;
    }
  }

  if (folderId != null) {
    const err = await requireFolderContentAccess(auth.session, folderId);
    if (err instanceof NextResponse) return err;
  } else if (!isPlatformAdmin(auth.session.user.role)) {
    return NextResponse.json({ error: "folderId or displayId is required" }, { status: 400 });
  }

  const asset = await prisma.contentAsset.create({
    data: {
      name: displayName,
      url,
      mediaKind,
      folderId,
    },
  });
  return NextResponse.json(asset, { status: 201 });
}
