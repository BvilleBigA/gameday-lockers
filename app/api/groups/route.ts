import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-session";
import { getDefaultTeamId } from "@/lib/default-team";
import { listAccessibleTeamIds, requireTeamAccess, requireTeamContentAccess } from "@/lib/org-permissions";

async function listGroupsWithBackfill(where?: Prisma.GroupWhereInput) {
  const raw = await prisma.group.findMany({
    where,
    orderBy: [{ name: "asc" }],
    include: {
      _count: { select: { displays: true } },
      contentFolder: { select: { id: true } },
    },
  });
  for (const g of raw) {
    if (!g.contentFolder) {
      await prisma.contentFolder
        .create({ data: { name: g.name, groupId: g.id } })
        .catch(() => {});
    }
  }
  return raw.map(({ contentFolder: _cf, ...rest }) => rest);
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("teamId");
    if (teamId !== null && teamId !== "") {
      const tid = Number(teamId);
      if (!Number.isFinite(tid)) {
        return NextResponse.json({ error: "Invalid teamId" }, { status: 400 });
      }
      const teamErr = await requireTeamAccess(auth.session, tid);
      if (teamErr) return teamErr;
      const groups = await listGroupsWithBackfill({ teamId: tid });
      return NextResponse.json(groups);
    }

    const ids = await listAccessibleTeamIds(auth.session.user.id, auth.session.user.role);
    const groups = await listGroupsWithBackfill(
      ids === "all" ? undefined : { teamId: { in: ids.length ? ids : [-1] } }
    );
    return NextResponse.json(groups);
  } catch (e) {
    console.error("[api/groups GET]", e);
    return NextResponse.json({ error: "Could not load groups" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    let teamId = Number(body?.teamId);
    if (!Number.isFinite(teamId)) {
      teamId = await getDefaultTeamId();
    } else {
      const teamErr = await requireTeamAccess(auth.session, teamId);
      if (teamErr) return teamErr;
    }

    const contentErr = await requireTeamContentAccess(auth.session, teamId);
    if (contentErr) return contentErr;

    // Nested `contentFolder` on `group.create` is rejected by some Prisma runtimes (validation only
    // lists `players`, not `contentFolder`) even when the schema is correct — avoid nested writes.
    // Do not use interactive `$transaction` here (tx delegates can be incomplete with Next externals).
    const group = await prisma.group.create({ data: { name, teamId } });
    try {
      await prisma.contentFolder.create({
        data: { name, parentId: null, groupId: group.id },
      });
    } catch (folderErr) {
      await prisma.group.delete({ where: { id: group.id } }).catch(() => {});
      throw folderErr;
    }

    return NextResponse.json(group, { status: 201 });
  } catch (e) {
    console.error("[api/groups POST]", e);
    const msg = e instanceof Error ? e.message : String(e);

    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2003") {
        return NextResponse.json(
          {
            error:
              "No valid team exists for this group (database may have been reset). Open Admin → Teams and ensure a team exists, then try again.",
          },
          { status: 500 }
        );
      }
      if (e.code === "P2002") {
        return NextResponse.json(
          { error: "That name conflicts with existing data. Try a different group name." },
          { status: 409 }
        );
      }
    }

    if (msg.includes("no such column") || msg.includes("does not exist")) {
      return NextResponse.json(
        {
          error:
            "Database is missing the latest migration. Run: npx prisma migrate deploy (or migrate dev locally).",
        },
        { status: 500 }
      );
    }

    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: isDev
          ? `Could not create group: ${msg}`
          : "Could not create group. If this persists, confirm DATABASE_URL points to your project database and migrations are applied.",
      },
      { status: 500 }
    );
  }
}
