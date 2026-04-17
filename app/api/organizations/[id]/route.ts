import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { canUserManageInvites } from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

/** Org metadata for settings UI (name, etc.) — works for platform admins who are not org members. */
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

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json(org);
}
