import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ token: string }> };

/** Public: invite details for signup page (no secrets). */
export async function GET(_req: Request, { params }: Params) {
  const token = String((await params).token ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: { organization: { select: { name: true } } },
  });
  if (!invite || invite.usedAt) {
    return NextResponse.json({ error: "Invite not found or already used" }, { status: 404 });
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true },
  });

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    organizationName: invite.organization.name,
    accountExists: !!existingUser,
  });
}
