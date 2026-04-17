import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import {
  effectiveTeamIdForDisplay,
  isPlatformAdmin,
  requireTeamAccess,
  requireTeamContentAccess,
} from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const display = await prisma.display.findUnique({
    where: { id },
    include: {
      team: true,
      overrideScene: true,
      player: true,
      group: { include: { contentFolder: { select: { id: true } } } },
    },
  });
  if (!display) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const eff = await effectiveTeamIdForDisplay(display);
  if (eff == null) {
    if (!isPlatformAdmin(auth.session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const err = await requireTeamAccess(auth.session, eff);
    if (err) return err;
  }
  return NextResponse.json(display);
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.display.findUnique({
    where: { id },
    select: { teamId: true, groupId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const priorTeam = await effectiveTeamIdForDisplay(existing);
  if (priorTeam == null) {
    if (!isPlatformAdmin(auth.session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const err = await requireTeamAccess(auth.session, priorTeam);
    if (err) return err;
  }

  const body = await req.json().catch(() => null);
  const label =
    body?.label === null
      ? null
      : typeof body?.label === "string"
        ? body.label.trim() || null
        : undefined;

  let groupId: number | null | undefined = undefined;
  if (body?.groupId !== undefined) {
    if (body.groupId === null || body.groupId === "") groupId = null;
    else {
      const g = Number(body.groupId);
      if (!Number.isFinite(g)) {
        return NextResponse.json({ error: "Invalid groupId" }, { status: 400 });
      }
      const group = await prisma.group.findUnique({ where: { id: g } });
      if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
      groupId = g;
    }
  }

  const liveTouched =
    body != null &&
    typeof body === "object" &&
    ("overrideSceneId" in body ||
      "directMediaUrl" in body ||
      "directMediaKind" in body ||
      "directThemeColor" in body);

  const data: {
    label?: string | null;
    groupId?: number | null;
    teamId?: number | null;
    overrideSceneId?: number | null;
    directMediaUrl?: string | null;
    directMediaKind?: string | null;
    directThemeColor?: string | null;
  } = {};

  if (label !== undefined) data.label = label;

  if (liveTouched) {
    const trimmedDirect =
      typeof body?.directMediaUrl === "string" ? body.directMediaUrl.trim() : "";
    const hasDirect = trimmedDirect.length > 0;

    if (hasDirect) {
      const mk =
        typeof body?.directMediaKind === "string" && ["URL", "IMAGE", "VIDEO"].includes(body.directMediaKind)
          ? body.directMediaKind
          : "IMAGE";
      const tc =
        typeof body?.directThemeColor === "string" && body.directThemeColor.trim()
          ? body.directThemeColor.trim()
          : "#1e293b";
      data.directMediaUrl = trimmedDirect;
      data.directMediaKind = mk;
      data.directThemeColor = tc;
      data.overrideSceneId = null;
    } else if (body?.overrideSceneId != null && body.overrideSceneId !== "") {
      const sid = Number(body.overrideSceneId);
      if (!Number.isFinite(sid)) {
        return NextResponse.json({ error: "Invalid overrideSceneId" }, { status: 400 });
      }
      const scene = await prisma.scene.findUnique({ where: { id: sid } });
      if (!scene) return NextResponse.json({ error: "Scene not found" }, { status: 404 });
      data.overrideSceneId = sid;
      data.directMediaUrl = null;
      data.directMediaKind = null;
      data.directThemeColor = null;
    } else {
      data.overrideSceneId = null;
      data.directMediaUrl = null;
      data.directMediaKind = null;
      data.directThemeColor = null;
    }
  }

  if (groupId !== undefined) {
    data.groupId = groupId;
    if (groupId !== null) {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (group) data.teamId = group.teamId;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const needsContent = liveTouched || groupId !== undefined;
  if (needsContent && priorTeam != null) {
    const contentErr = await requireTeamContentAccess(auth.session, priorTeam);
    if (contentErr) return contentErr;
  }
  if (groupId !== undefined && groupId !== null) {
    const g = await prisma.group.findUnique({ where: { id: groupId }, select: { teamId: true } });
    if (g) {
      const c2 = await requireTeamContentAccess(auth.session, g.teamId);
      if (c2) return c2;
    }
  }

  try {
    const display = await prisma.display.update({
      where: { id },
      data,
      include: {
        team: true,
        overrideScene: true,
        group: { include: { contentFolder: { select: { id: true } } } },
      },
    });
    return NextResponse.json(display);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[PATCH /api/displays/[id]]", e);
    const detail =
      process.env.NODE_ENV === "development" && e instanceof Error ? e.message : "Could not update display";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
