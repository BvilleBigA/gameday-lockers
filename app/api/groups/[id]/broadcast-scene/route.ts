import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { applyWallSceneSnapshot } from "@/lib/wall-scene-snapshot";
import { canUserControlTeam } from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

/** Clear group overrides, or apply a saved wall snapshot (per-display content). */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const clear = body?.clear === true;

  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const can = await canUserControlTeam(auth.session.user.id, group.teamId, auth.session.user.role);
  if (!can) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (clear) {
    const result = await prisma.display.updateMany({
      where: { groupId: id, isPaired: true },
      data: {
        overrideSceneId: null,
        directMediaUrl: null,
        directMediaKind: null,
        directThemeColor: null,
      },
    });
    return NextResponse.json({ ok: true, updated: result.count, cleared: true });
  }

  const wallSnapshotId = Number(body?.wallSnapshotId);
  if (!Number.isFinite(wallSnapshotId)) {
    return NextResponse.json(
      { error: "wallSnapshotId is required (or pass clear: true)" },
      { status: 400 }
    );
  }

  try {
    const { updated } = await applyWallSceneSnapshot(id, wallSnapshotId);
    return NextResponse.json({
      ok: true,
      updated,
      cleared: false,
      wallSnapshotId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not apply snapshot";
    if (msg === "Snapshot not found") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
