import { hash, compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MIN_PASSWORD = 8;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD} characters` },
      { status: 400 }
    );
  }

  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
  });
  if (!invite || invite.usedAt) {
    return NextResponse.json({ error: "Invite not found or already used" }, { status: 404 });
  }
  if (invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 410 });
  }

  const existing = await prisma.user.findUnique({ where: { email: invite.email } });
  if (existing) {
    const ok = await compare(password, existing.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid password for this email" }, { status: 401 });
    }
    await prisma.organizationMember.upsert({
      where: {
        userId_organizationId: { userId: existing.id, organizationId: invite.organizationId },
      },
      update: { role: invite.role },
      create: {
        userId: existing.id,
        organizationId: invite.organizationId,
        role: invite.role,
      },
    });
  } else {
    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: invite.email,
        name: name || null,
        passwordHash,
        role: "USER",
      },
    });
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: invite.organizationId,
        role: invite.role,
      },
    });
  }

  await prisma.organizationInvite.update({
    where: { id: invite.id },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
