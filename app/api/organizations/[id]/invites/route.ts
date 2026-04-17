import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { canUserManageInvites, isPlatformAdmin } from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

const INVITE_DAYS = 14;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

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

  const invites = await prisma.organizationInvite.findMany({
    where: { organizationId, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(invites);
}

export async function POST(req: Request, { params }: Params) {
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

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const roleRaw = typeof body?.role === "string" ? body.role.toUpperCase().trim() : "";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  if (isPlatformAdmin(auth.session.user.role)) {
    if (!["OWNER", "COACH", "MANAGER"].includes(roleRaw)) {
      return NextResponse.json({ error: "role must be OWNER, COACH, or MANAGER" }, { status: 400 });
    }
  } else if (!["COACH", "MANAGER"].includes(roleRaw)) {
    return NextResponse.json(
      { error: "Owners may only invite COACH or MANAGER" },
      { status: 400 }
    );
  }
  const role = roleRaw;

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const userWithEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (userWithEmail) {
    const already = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: { userId: userWithEmail.id, organizationId },
      },
    });
    if (already) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }
  }

  await prisma.organizationInvite.deleteMany({
    where: { organizationId, email, usedAt: null },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_DAYS * 864e5);

  const invite = await prisma.organizationInvite.create({
    data: {
      organizationId,
      email,
      role,
      token,
      expiresAt,
      createdByUserId: auth.session.user.id,
    },
  });

  return NextResponse.json(
    {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      inviteUrl: `/invite/${invite.token}`,
    },
    { status: 201 }
  );
}
