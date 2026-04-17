import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { requireTeamContentAccess } from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string; snapshotId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const groupId = Number((await params).id);
  const snapshotId = Number((await params).snapshotId);
  if (!Number.isFinite(groupId) || !Number.isFinite(snapshotId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const snap = await prisma.wallSceneSnapshot.findFirst({
    where: { id: snapshotId, groupId },
  });
  if (!snap) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentErr = await requireTeamContentAccess(auth.session, snap.teamId);
  if (contentErr) return contentErr;

  await prisma.wallSceneSnapshot.delete({ where: { id: snapshotId } });
  return NextResponse.json({ ok: true });
}
