import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { canUserManageInvites, isPlatformAdmin } from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const organizationId = Number((await params).id);
  if (!Number.isFinite(organizationId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const can = await canUserManageInvites(
    auth.session.user.id,
    organizationId,
    auth.session.user.role
  );
  if (!can) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(members);
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const organizationId = Number((await params).id);
  if (!Number.isFinite(organizationId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const can = await canUserManageInvites(
    auth.session.user.id,
    organizationId,
    auth.session.user.role
  );
  if (!can) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId query required" }, { status: 400 });
  }

  const target = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role === "OWNER" && !isPlatformAdmin(auth.session.user.role)) {
    const ownerCount = await prisma.organizationMember.count({
      where: { organizationId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json({ error: "Cannot remove the last owner" }, { status: 400 });
    }
  }

  await prisma.organizationMember.delete({
    where: { userId_organizationId: { userId, organizationId } },
  });
  return NextResponse.json({ ok: true });
}
