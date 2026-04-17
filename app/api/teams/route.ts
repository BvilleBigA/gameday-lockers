import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import {
  getMembershipInOrg,
  isPlatformAdmin,
  orgRoleCanEditContent,
  teamWhereForUser,
} from "@/lib/org-permissions";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { user } = auth.session;
  const scope = teamWhereForUser(user.id, user.role);

  const teams = await prisma.team.findMany({
    where: scope ?? undefined,
    orderBy: { name: "asc" },
    include: {
      groups: { orderBy: { name: "asc" } },
      organization: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  let organizationId = Number(body?.organizationId);
  const { user } = auth.session;

  if (isPlatformAdmin(user.role)) {
    if (!Number.isFinite(organizationId)) {
      return NextResponse.json({ error: "organizationId is required" }, { status: 400 });
    }
  } else {
    if (!Number.isFinite(organizationId)) {
      const editable = await prisma.organizationMember.findMany({
        where: {
          userId: user.id,
          role: { in: ["OWNER", "COACH"] },
        },
        select: { organizationId: true },
      });
      if (editable.length !== 1) {
        return NextResponse.json(
          { error: "organizationId is required when you belong to multiple organizations" },
          { status: 400 }
        );
      }
      organizationId = editable[0].organizationId;
    } else {
      const m = await getMembershipInOrg(user.id, organizationId);
      if (!m || !orgRoleCanEditContent(m.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const team = await prisma.team.create({
    data: { name, organizationId },
    include: { organization: { select: { id: true, name: true } } },
  });
  return NextResponse.json(team, { status: 201 });
}
