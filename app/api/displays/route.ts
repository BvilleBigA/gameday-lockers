import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { listAccessibleTeamIds } from "@/lib/org-permissions";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const ids = await listAccessibleTeamIds(auth.session.user.id, auth.session.user.role);
  const where: Prisma.DisplayWhereInput =
    ids === "all"
      ? {}
      : {
          OR: [
            { teamId: { in: ids.length ? ids : [-1] } },
            { group: { teamId: { in: ids.length ? ids : [-1] } } },
          ],
        };

  const displays = await prisma.display.findMany({
    where,
    orderBy: { id: "asc" },
    include: {
      team: true,
      overrideScene: true,
      group: { include: { contentFolder: { select: { id: true } } } },
    },
  });
  return NextResponse.json(displays);
}
