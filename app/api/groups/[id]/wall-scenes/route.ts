import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { createWallSnapshotForGroup, previewForCaptures } from "@/lib/wall-scene-snapshot";
import { requireTeamAccess, requireTeamContentAccess } from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const groupId = Number((await params).id);
  if (!Number.isFinite(groupId)) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  const teamErr = await requireTeamAccess(auth.session, group.teamId);
  if (teamErr) return teamErr;

  const list = await prisma.wallSceneSnapshot.findMany({
    where: { groupId },
    orderBy: { id: "desc" },
    include: {
      captures: { orderBy: { displayId: "asc" } },
    },
  });

  const snapshots = await Promise.all(
    list.map(async (s) => {
      const preview = await previewForCaptures(s.captures);
      return {
        id: s.id,
        name: s.name,
        createdAt: s.createdAt.toISOString(),
        displayCount: s.captures.length,
        previewUrl: preview?.url ?? null,
        previewMediaKind: preview?.mediaKind ?? "IMAGE",
        previewThemeColor: preview?.themeColor ?? "#1e293b",
      };
    })
  );

  return NextResponse.json({ snapshots });
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const groupId = Number((await params).id);
  if (!Number.isFinite(groupId)) {
    return NextResponse.json({ error: "Invalid group id" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  const contentErr = await requireTeamContentAccess(auth.session, group.teamId);
  if (contentErr) return contentErr;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const { id, displayCount } = await createWallSnapshotForGroup(groupId, name);
    return NextResponse.json({ id, name, displayCount }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
