import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { isPlatformAdmin, listAccessibleTeamIds, requireFolderAccess } from "@/lib/org-permissions";

function parseParentId(raw: string | null): number | null | undefined {
  if (raw === null || raw === "") return null;
  if (raw === "root") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

/** List folders and assets for a parent folder (omit parentId for library root). */
export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const parentId = parseParentId(searchParams.get("parentId"));
  if (parentId === undefined) {
    return NextResponse.json({ error: "Invalid parentId" }, { status: 400 });
  }

  if (parentId !== null) {
    const acc = await requireFolderAccess(auth.session, parentId);
    if (acc instanceof NextResponse) return acc;
  }

  const scope = await listAccessibleTeamIds(auth.session.user.id, auth.session.user.role);
  const folderWhere: Prisma.ContentFolderWhereInput = { parentId };
  if (parentId === null && !isPlatformAdmin(auth.session.user.role)) {
    const ids = scope === "all" ? [] : scope;
    folderWhere.group = { teamId: { in: ids.length ? ids : [-1] } };
  }

  const [folders, assets] = await Promise.all([
    prisma.contentFolder.findMany({
      where: folderWhere,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        parentId: true,
        groupId: true,
        createdAt: true,
        _count: { select: { children: true, assets: true } },
      },
    }),
    prisma.contentAsset.findMany({
      where: { folderId: parentId },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ parentId, folders, assets });
}
