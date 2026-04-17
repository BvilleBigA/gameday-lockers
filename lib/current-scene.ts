import type { Scene } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseSceneLayout, type SceneLayoutState } from "@/lib/scene-layout";

const DEFAULT_MEDIA_BASE_URL = "https://lockers.bvillebiga.com";

function normalizeMediaBaseUrl(): string {
  const raw =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_ADMIN_URL ||
    DEFAULT_MEDIA_BASE_URL;
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_MEDIA_BASE_URL;
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

function toAbsoluteMediaUrl(input: string): string {
  const value = input.trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${normalizeMediaBaseUrl()}${path}`;
}

export type LiveSceneDto = {
  id: number;
  name: string;
  backgroundUrl: string;
  themeColor: string;
  mediaKind: string;
  layout: SceneLayoutState;
};

export type LiveScenePayload = {
  scene: LiveSceneDto;
  source: "direct" | "override" | "scheduled" | "default";
};

const DEFAULT_SCENE_FALLBACK: LiveSceneDto = {
  id: 0,
  name: "Default",
  backgroundUrl:
    "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1920&q=80",
  themeColor: "#0f172a",
  mediaKind: "URL",
  layout: parseSceneLayout("{}", "Default"),
};

function sceneToDto(s: Scene): LiveSceneDto {
  return {
    id: s.id,
    name: s.name,
    backgroundUrl: toAbsoluteMediaUrl(s.backgroundUrl),
    themeColor: s.themeColor,
    mediaKind: s.mediaKind || "URL",
    layout: parseSceneLayout(s.layoutJson ?? "{}", s.name),
  };
}

function directMediaToDto(display: {
  directMediaUrl: string;
  directMediaKind: string | null;
  directThemeColor: string | null;
}): LiveSceneDto {
  const mediaKind = display.directMediaKind?.trim() || "IMAGE";
  const themeColor = display.directThemeColor?.trim() || "#1e293b";
  return {
    id: 0,
    name: "Direct media",
    backgroundUrl: toAbsoluteMediaUrl(display.directMediaUrl),
    themeColor,
    mediaKind,
    layout: parseSceneLayout("{}", "Direct"),
  };
}

export type ResolveDisplayStatus = LiveScenePayload | "not_found" | "not_registered";

export async function resolveCurrentSceneForDisplay(
  displayId: number
): Promise<ResolveDisplayStatus> {
  const display = await prisma.display.findUnique({
    where: { id: displayId },
    include: { overrideScene: true, group: { select: { teamId: true } } },
  });

  if (!display) return "not_found";

  const teamId = display.teamId ?? display.group?.teamId ?? null;
  if (!display.isPaired || teamId == null) {
    return "not_registered";
  }

  const directUrl = display.directMediaUrl?.trim();
  if (directUrl) {
    return {
      scene: directMediaToDto({
        directMediaUrl: directUrl,
        directMediaKind: display.directMediaKind,
        directThemeColor: display.directThemeColor,
      }),
      source: "direct",
    };
  }

  if (display.overrideSceneId && display.overrideScene) {
    return {
      scene: sceneToDto(display.overrideScene),
      source: "override",
    };
  }

  const now = new Date();
  const schedules = await prisma.schedule.findMany({
    where: {
      startTime: { lte: now },
      endTime: { gte: now },
      targetType: "TEAM",
      targetId: teamId,
    },
    include: { scene: true },
    orderBy: { startTime: "desc" },
  });

  const active = schedules[0];
  if (active?.scene) {
    return { scene: sceneToDto(active.scene), source: "scheduled" };
  }

  const fallback =
    (await prisma.scene.findFirst({
      where: { teamId, name: "Default" },
    })) ??
    (await prisma.scene.findFirst({
      where: { teamId },
      orderBy: { id: "asc" },
    })) ??
    (await prisma.scene.findFirst({
      where: { name: "Default", teamId: null },
    }));

  if (!fallback) {
    return { scene: DEFAULT_SCENE_FALLBACK, source: "default" };
  }

  return { scene: sceneToDto(fallback), source: "default" };
}

/** Scene IDs currently shown on at least one paired display for this team (override + schedule/default). */
export async function getLiveSceneIdsForTeam(teamId: number): Promise<number[]> {
  const displays = await prisma.display.findMany({
    where: { teamId, isPaired: true },
    include: { overrideScene: true },
  });

  const ids = new Set<number>();
  let anyWithoutOverride = false;

  for (const d of displays) {
    if (d.overrideScene) {
      ids.add(d.overrideScene.id);
    } else {
      anyWithoutOverride = true;
    }
  }

  if (anyWithoutOverride) {
    const now = new Date();
    const schedules = await prisma.schedule.findMany({
      where: {
        startTime: { lte: now },
        endTime: { gte: now },
        targetType: "TEAM",
        targetId: teamId,
      },
      include: { scene: true },
      orderBy: { startTime: "desc" },
    });
    const active = schedules[0];
    if (active?.scene) {
      ids.add(active.scene.id);
    } else {
      const fallback =
        (await prisma.scene.findFirst({
          where: { teamId, name: "Default" },
        })) ??
        (await prisma.scene.findFirst({
          where: { teamId },
          orderBy: { id: "asc" },
        })) ??
        (await prisma.scene.findFirst({
          where: { name: "Default", teamId: null },
        }));
      if (fallback) ids.add(fallback.id);
    }
  }

  return [...ids];
}

