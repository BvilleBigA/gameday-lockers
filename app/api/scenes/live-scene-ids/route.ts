import { NextResponse } from "next/server";
import { getLiveSceneIdsForTeam } from "@/lib/current-scene";
import { requireAuth } from "@/lib/require-session";
import { requireTeamAccess } from "@/lib/org-permissions";

export async function GET(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const teamIdParam = searchParams.get("teamId");
  if (teamIdParam === null || teamIdParam === "") {
    return NextResponse.json({ error: "teamId is required" }, { status: 400 });
  }
  const teamId = Number(teamIdParam);
  if (!Number.isFinite(teamId)) {
    return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
  }

  const err = await requireTeamAccess(auth.session, teamId);
  if (err) return err;

  const sceneIds = await getLiveSceneIdsForTeam(teamId);
  return NextResponse.json({ sceneIds });
}
