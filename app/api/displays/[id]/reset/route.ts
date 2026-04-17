import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import {
  effectiveTeamIdForDisplay,
  isPlatformAdmin,
  requireTeamContentAccess,
} from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

/** Removes the screen from the system so its code can be registered again from a new session. */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const d = await prisma.display.findUnique({
    where: { id },
    select: { teamId: true, groupId: true },
  });
  if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const eff = await effectiveTeamIdForDisplay(d);
  if (eff == null) {
    if (!isPlatformAdmin(auth.session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const c = await requireTeamContentAccess(auth.session, eff);
    if (c) return c;
  }

  try {
    await prisma.display.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
