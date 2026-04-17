import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { resolveCurrentSceneForDisplay } from "@/lib/current-scene";
import { requireTeamAccess } from "@/lib/org-permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const id = Number((await params).id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      displays: {
        orderBy: { id: "asc" },
        include: { overrideScene: { select: { id: true, name: true } } },
      },
    },
  });

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const teamErr = await requireTeamAccess(auth.session, group.teamId);
  if (teamErr) return teamErr;

  const tiles = await Promise.all(
    group.displays.map(async (d) => {
      const live = await resolveCurrentSceneForDisplay(d.id);
      if (live === "not_found" || live === "not_registered") {
        return {
          id: d.id,
          label: d.label,
          pairingCode: d.pairingCode,
          isPaired: d.isPaired,
          live: null,
          status: live,
        };
      }
      const { scene, source } = live;
      return {
        id: d.id,
        label: d.label,
        pairingCode: d.pairingCode,
        isPaired: d.isPaired,
        live: {
          sceneName: scene.name,
          backgroundUrl: scene.backgroundUrl,
          mediaKind: scene.mediaKind,
          themeColor: scene.themeColor,
          source,
        },
        status: "ok" as const,
      };
    })
  );

  return NextResponse.json({
    group: { id: group.id, name: group.name, teamId: group.teamId },
    displays: tiles,
  });
}
