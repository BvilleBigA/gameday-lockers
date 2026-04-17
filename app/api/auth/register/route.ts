import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MIN_PASSWORD = 8;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const emailRaw = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;

  if (!emailRaw || !emailRaw.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD} characters` },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: emailRaw } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  await prisma.user.create({
    data: {
      email: emailRaw,
      name: name || null,
      passwordHash,
      role: "USER",
    },
  });

  return NextResponse.json({ ok: true });
}
