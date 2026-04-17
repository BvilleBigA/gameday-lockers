import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { parseSceneLayout, serializeSceneLayout } from "@/lib/scene-layout";
import {
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
  const scene = await prisma.scene.findUnique({ where: { id }, include: { team: true } });
  if (!scene) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (scene.teamId == null) {
    if (!isPlatformAdmin(auth.session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const err = await requireTeamAccess(auth.session, scene.teamId);
    if (err) return err;
  }
  return NextResponse.json(scene);
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const existingScene = await prisma.scene.findUnique({ where: { id }, select: { teamId: true } });
  if (!existingScene) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existingScene.teamId == null) {
    if (!isPlatformAdmin(auth.session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const contentErr = await requireTeamContentAccess(auth.session, existingScene.teamId);
    if (contentErr) return contentErr;
  }

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const backgroundUrl =
    typeof body?.backgroundUrl === "string" ? body.backgroundUrl.trim() : undefined;
  const themeColor =
    typeof body?.themeColor === "string" ? body.themeColor.trim() : undefined;
  const mediaKind =
    typeof body?.mediaKind === "string" && ["URL", "IMAGE", "VIDEO"].includes(body.mediaKind)
      ? body.mediaKind
      : undefined;
  let teamId: number | null | undefined = undefined;
  if (body?.teamId !== undefined) {
    if (body.teamId === null || body.teamId === "") teamId = null;
    else teamId = Number(body.teamId);
  }

  let layoutJson: string | undefined;
  if (body?.layoutJson !== undefined) {
    const raw =
      typeof body.layoutJson === "string"
        ? body.layoutJson
        : typeof body.layoutJson === "object" && body.layoutJson !== null
          ? JSON.stringify(body.layoutJson)
          : null;
    if (raw === null) {
      return NextResponse.json({ error: "Invalid layoutJson" }, { status: 400 });
    }
    try {
      JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "layoutJson must be valid JSON" }, { status: 400 });
    }
    const existing = await prisma.scene.findUnique({ where: { id }, select: { name: true } });
    const sceneName =
      typeof body?.name === "string" && body.name.trim() ? body.name.trim() : existing?.name ?? "";
    layoutJson = serializeSceneLayout(parseSceneLayout(raw, sceneName));
  }

  const data: {
    name?: string;
    backgroundUrl?: string;
    themeColor?: string;
    mediaKind?: string;
    teamId?: number | null;
    layoutJson?: string;
  } = {};
  if (name !== undefined) {
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if (backgroundUrl !== undefined) {
    if (!backgroundUrl) {
      return NextResponse.json({ error: "backgroundUrl cannot be empty" }, { status: 400 });
    }
    data.backgroundUrl = backgroundUrl;
  }
  if (themeColor !== undefined) {
    if (!themeColor) {
      return NextResponse.json({ error: "themeColor cannot be empty" }, { status: 400 });
    }
    data.themeColor = themeColor;
  }
  if (mediaKind !== undefined) data.mediaKind = mediaKind;
  if (teamId !== undefined) {
    if (teamId !== null && !Number.isFinite(teamId)) {
      return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
    }
    if (teamId !== null) {
      const teamErr = await requireTeamAccess(auth.session, teamId);
      if (teamErr) return teamErr;
      const contentErr = await requireTeamContentAccess(auth.session, teamId);
      if (contentErr) return contentErr;
    }
    data.teamId = teamId;
  }
  if (layoutJson !== undefined) data.layoutJson = layoutJson;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const scene = await prisma.scene.update({ where: { id }, data, include: { team: true } });
    return NextResponse.json(scene);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

   const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const existingScene = await prisma.scene.findUnique({ where: { id }, select: { teamId: true } });
  if (!existingScene) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existingScene.teamId == null) {
    if (!isPlatformAdmin(auth.session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const contentErr = await requireTeamContentAccess(auth.session, existingScene.teamId);
    if (contentErr) return contentErr;
  }
  try {
    await prisma.scene.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
