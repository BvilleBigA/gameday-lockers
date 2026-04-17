import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-session";

type Params = { params: Promise<{ id: string }> };

/**
 * Platform admin: delete an organization and all teams (cascading groups, scenes, players, etc.).
 * Members and invites for the org are removed with the organization row.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const r = await requireAdmin();
  if (!r.ok) return r.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const teams = await tx.team.findMany({
        where: { organizationId: id },
        select: { id: true },
      });
      for (const t of teams) {
        await tx.team.delete({ where: { id: t.id } });
      }
      await tx.organization.delete({ where: { id } });
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("[DELETE /api/admin/organizations/[id]]", e);
    return NextResponse.json({ error: "Could not delete organization" }, { status: 500 });
  }
}
