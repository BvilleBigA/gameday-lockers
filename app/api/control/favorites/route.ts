import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { canUserControlTeam } from "@/lib/org-permissions";
import { previewForCaptures } from "@/lib/wall-scene-snapshot";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const teamId = Number(new URL(req.url).searchParams.get("teamId"));
  if (!Number.isFinite(teamId)) {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }

  const can = await canUserControlTeam(auth.session.user.id, teamId, auth.session.user.role);
  if (!can) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = auth.session.user.id;

  const [sceneRows, wallRows] = await Promise.all([
    prisma.userFavoriteScene.findMany({
      where: {
        userId,
        scene: { OR: [{ teamId }, { teamId: null }] },
      },
      include: { scene: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userFavoriteWallSnapshot.findMany({
      where: { userId, snapshot: { teamId } },
      include: {
        snapshot: {
          include: {
            group: { select: { id: true, name: true } },
            captures: { orderBy: { displayId: "asc" } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const scenes = sceneRows
    .map((r) => r.scene)
    .filter((s) => s.teamId == null || s.teamId === teamId)
    .map((s) => ({
      id: s.id,
      name: s.name,
      backgroundUrl: s.backgroundUrl,
      themeColor: s.themeColor,
      mediaKind: s.mediaKind,
    }));

  const wallSnapshots = await Promise.all(
    wallRows.map(async (r) => {
      const s = r.snapshot;
      const preview = await previewForCaptures(s.captures);
      return {
        id: s.id,
        name: s.name,
        groupId: s.groupId,
        groupName: s.group.name,
        displayCount: s.captures.length,
        previewUrl: preview?.url ?? null,
        previewMediaKind: preview?.mediaKind ?? "IMAGE",
        previewThemeColor: preview?.themeColor ?? "#1e293b",
      };
    })
  );

  return NextResponse.json({ scenes, wallSnapshots });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const teamId = Number(body?.teamId);
  const favorite = body?.favorite === true;
  const kind = body?.kind === "wall" ? "wall" : body?.kind === "scene" ? "scene" : null;

  if (!Number.isFinite(teamId) || !kind) {
    return NextResponse.json({ error: "teamId and kind (scene|wall) are required" }, { status: 400 });
  }

  const can = await canUserControlTeam(auth.session.user.id, teamId, auth.session.user.role);
  if (!can) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = auth.session.user.id;

  if (kind === "scene") {
    const sceneId = Number(body?.sceneId);
    if (!Number.isFinite(sceneId)) {
      return NextResponse.json({ error: "sceneId is required" }, { status: 400 });
    }
    const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }
    if (scene.teamId != null && scene.teamId !== teamId) {
      return NextResponse.json({ error: "Scene is not available for this team" }, { status: 400 });
    }
    if (favorite) {
      await prisma.userFavoriteScene.upsert({
        where: { userId_sceneId: { userId, sceneId } },
        create: { userId, sceneId },
        update: {},
      });
    } else {
      await prisma.userFavoriteScene.deleteMany({ where: { userId, sceneId } });
    }
    return NextResponse.json({ ok: true, favorite });
  }

  const wallSnapshotId = Number(body?.wallSnapshotId);
  if (!Number.isFinite(wallSnapshotId)) {
    return NextResponse.json({ error: "wallSnapshotId is required" }, { status: 400 });
  }
  const snap = await prisma.wallSceneSnapshot.findUnique({
    where: { id: wallSnapshotId },
    select: { id: true, teamId: true },
  });
  if (!snap) {
    return NextResponse.json({ error: "Wall snapshot not found" }, { status: 404 });
  }
  if (snap.teamId !== teamId) {
    return NextResponse.json({ error: "Snapshot is not for this team" }, { status: 400 });
  }
  if (favorite) {
    await prisma.userFavoriteWallSnapshot.upsert({
      where: { userId_snapshotId: { userId, snapshotId: wallSnapshotId } },
      create: { userId, snapshotId: wallSnapshotId },
      update: {},
    });
  } else {
    await prisma.userFavoriteWallSnapshot.deleteMany({
      where: { userId, snapshotId: wallSnapshotId },
    });
  }
  return NextResponse.json({ ok: true, favorite });
}
