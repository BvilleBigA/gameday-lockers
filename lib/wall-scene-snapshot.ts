import { prisma } from "@/lib/prisma";
import { resolveCurrentSceneForDisplay } from "@/lib/current-scene";

export type CaptureRow = {
  displayId: number;
  overrideSceneId: number | null;
  directMediaUrl: string | null;
  directMediaKind: string | null;
  directThemeColor: string | null;
};

/** Read one paired display’s effective live state for storing in a wall snapshot. */
export async function captureDisplayState(displayId: number): Promise<CaptureRow | null> {
  const display = await prisma.display.findUnique({
    where: { id: displayId },
    select: {
      id: true,
      directMediaUrl: true,
      directMediaKind: true,
      directThemeColor: true,
      overrideSceneId: true,
      isPaired: true,
    },
  });
  if (!display?.isPaired) return null;

  const dUrl = display.directMediaUrl?.trim();
  if (dUrl) {
    return {
      displayId: display.id,
      overrideSceneId: null,
      directMediaUrl: dUrl,
      directMediaKind: display.directMediaKind?.trim() || "IMAGE",
      directThemeColor: display.directThemeColor?.trim() || "#1e293b",
    };
  }

  if (display.overrideSceneId != null) {
    return {
      displayId: display.id,
      overrideSceneId: display.overrideSceneId,
      directMediaUrl: null,
      directMediaKind: null,
      directThemeColor: null,
    };
  }

  const live = await resolveCurrentSceneForDisplay(displayId);
  if (live === "not_found" || live === "not_registered") {
    return {
      displayId: display.id,
      overrideSceneId: null,
      directMediaUrl: null,
      directMediaKind: null,
      directThemeColor: null,
    };
  }
  const { scene } = live;
  return {
    displayId: display.id,
    overrideSceneId: null,
    directMediaUrl: scene.backgroundUrl,
    directMediaKind: scene.mediaKind || "IMAGE",
    directThemeColor: scene.themeColor || "#1e293b",
  };
}

export async function createWallSnapshotForGroup(
  groupId: number,
  name: string
): Promise<{ id: number; displayCount: number }> {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new Error("Group not found");

  const displays = await prisma.display.findMany({
    where: { groupId, isPaired: true },
    orderBy: { id: "asc" },
    select: { id: true },
  });

  const rows: CaptureRow[] = [];
  for (const d of displays) {
    const row = await captureDisplayState(d.id);
    if (row) rows.push(row);
  }

  const snap = await prisma.$transaction(async (tx) => {
    const created = await tx.wallSceneSnapshot.create({
      data: {
        name: name.trim(),
        groupId,
        teamId: group.teamId,
      },
    });
    for (const r of rows) {
      await tx.wallSceneDisplayCapture.create({
        data: {
          snapshotId: created.id,
          displayId: r.displayId,
          overrideSceneId: r.overrideSceneId,
          directMediaUrl: r.directMediaUrl,
          directMediaKind: r.directMediaKind,
          directThemeColor: r.directThemeColor,
        },
      });
    }
    return created;
  });

  return { id: snap.id, displayCount: rows.length };
}

export async function applyWallSceneSnapshot(
  groupId: number,
  snapshotId: number
): Promise<{ updated: number }> {
  const snap = await prisma.wallSceneSnapshot.findFirst({
    where: { id: snapshotId, groupId },
    include: {
      captures: { orderBy: { displayId: "asc" } },
    },
  });
  if (!snap) throw new Error("Snapshot not found");

  let updated = 0;
  for (const cap of snap.captures) {
    const display = await prisma.display.findUnique({
      where: { id: cap.displayId },
      select: { id: true, groupId: true, isPaired: true },
    });
    if (!display?.isPaired || display.groupId !== groupId) continue;

    if (cap.overrideSceneId != null) {
      const scene = await prisma.scene.findUnique({ where: { id: cap.overrideSceneId } });
      if (!scene) continue;
      await prisma.display.update({
        where: { id: cap.displayId },
        data: {
          overrideSceneId: cap.overrideSceneId,
          directMediaUrl: null,
          directMediaKind: null,
          directThemeColor: null,
        },
      });
      updated += 1;
    } else if (cap.directMediaUrl?.trim()) {
      await prisma.display.update({
        where: { id: cap.displayId },
        data: {
          overrideSceneId: null,
          directMediaUrl: cap.directMediaUrl.trim(),
          directMediaKind: cap.directMediaKind?.trim() || "IMAGE",
          directThemeColor: cap.directThemeColor?.trim() || "#1e293b",
        },
      });
      updated += 1;
    } else {
      await prisma.display.update({
        where: { id: cap.displayId },
        data: {
          overrideSceneId: null,
          directMediaUrl: null,
          directMediaKind: null,
          directThemeColor: null,
        },
      });
      updated += 1;
    }
  }

  return { updated };
}

type CapturePreview = {
  overrideSceneId: number | null;
  directMediaUrl: string | null;
  directMediaKind: string | null;
  directThemeColor: string | null;
};

export async function previewForCaptures(
  captures: CapturePreview[]
): Promise<{ url: string; mediaKind: string; themeColor: string } | null> {
  for (const c of captures) {
    if (c.directMediaUrl?.trim()) {
      return {
        url: c.directMediaUrl.trim(),
        mediaKind: c.directMediaKind?.trim() || "IMAGE",
        themeColor: c.directThemeColor?.trim() || "#1e293b",
      };
    }
    if (c.overrideSceneId != null) {
      const scene = await prisma.scene.findUnique({
        where: { id: c.overrideSceneId },
        select: { backgroundUrl: true, mediaKind: true, themeColor: true },
      });
      if (scene) {
        return {
          url: scene.backgroundUrl,
          mediaKind: scene.mediaKind || "IMAGE",
          themeColor: scene.themeColor || "#1e293b",
        };
      }
    }
  }
  return null;
}
