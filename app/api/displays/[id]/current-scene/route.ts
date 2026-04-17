import { NextResponse } from "next/server";
import { resolveCurrentSceneForDisplay } from "@/lib/current-scene";
import { resolveDisplayIdFromRouteSegment } from "@/lib/resolve-display-from-route-segment";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const raw = ((await params).id ?? "").trim();
  const id = await resolveDisplayIdFromRouteSegment(raw);
  if (id == null) {
    if (/^\d+$/.test(raw) && parseInt(raw, 10) > 0) {
      return NextResponse.json({ error: "Display not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Invalid screen id or pairing code" }, { status: 400 });
  }

  const result = await resolveCurrentSceneForDisplay(id);

  if (result === "not_found") {
    return NextResponse.json({ error: "Display not found" }, { status: 404 });
  }

  if (result === "not_registered") {
    return NextResponse.json(
      { error: "Display is not registered to a team" },
      { status: 409 }
    );
  }

  return NextResponse.json(result);
}
