import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-session";

export async function GET() {
  const r = await requireAdmin();
  if (!r.ok) return r.response;

  const orgs = await prisma.organization.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { members: true, teams: true } },
    },
  });
  return NextResponse.json(orgs);
}

export async function POST(req: Request) {
  const r = await requireAdmin();
  if (!r.ok) return r.response;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const org = await prisma.organization.create({ data: { name } });
  return NextResponse.json(org, { status: 201 });
}
