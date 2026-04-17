import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AuthedSession } from "@/lib/require-session";
import { NextResponse } from "next/server";

export const ORG_ROLES = {
  OWNER: "OWNER",
  COACH: "COACH",
  MANAGER: "MANAGER",
} as const;

export type OrgRole = (typeof ORG_ROLES)[keyof typeof ORG_ROLES];

export const INVITEABLE_BY_OWNER: OrgRole[] = [ORG_ROLES.COACH, ORG_ROLES.MANAGER];

export function isPlatformAdmin(role: string): boolean {
  return role === "ADMIN";
}

export function orgRoleCanEditContent(role: string): boolean {
  return role === ORG_ROLES.OWNER || role === ORG_ROLES.COACH;
}

export function orgRoleCanControl(role: string): boolean {
  return role === ORG_ROLES.OWNER || role === ORG_ROLES.COACH || role === ORG_ROLES.MANAGER;
}

export function orgRoleIsOwner(role: string): boolean {
  return role === ORG_ROLES.OWNER;
}

/** Prisma filter: teams visible to this user (undefined = no filter / platform admin). */
export function teamWhereForUser(userId: string, platformRole: string): Prisma.TeamWhereInput | undefined {
  if (isPlatformAdmin(platformRole)) return undefined;
  return {
    organization: {
      members: { some: { userId } },
    },
  };
}

export async function listAccessibleTeamIds(
  userId: string,
  platformRole: string
): Promise<number[] | "all"> {
  if (isPlatformAdmin(platformRole)) return "all";
  const teams = await prisma.team.findMany({
    where: {
      organization: { members: { some: { userId } } },
    },
    select: { id: true },
  });
  return teams.map((t) => t.id);
}

export async function getTeamInScope(teamId: number, userId: string, platformRole: string) {
  const scope = teamWhereForUser(userId, platformRole);
  return prisma.team.findFirst({
    where: scope ? { id: teamId, ...scope } : { id: teamId },
    include: { organization: true },
  });
}

export async function canUserControlTeam(
  userId: string,
  teamId: number,
  platformRole: string
): Promise<boolean> {
  if (isPlatformAdmin(platformRole)) return true;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { organizationId: true },
  });
  if (!team) return false;
  const m = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: { userId, organizationId: team.organizationId },
    },
  });
  return !!m && orgRoleCanControl(m.role);
}

export async function canUserEditContentForTeam(
  userId: string,
  teamId: number,
  platformRole: string
): Promise<boolean> {
  if (isPlatformAdmin(platformRole)) return true;
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { organizationId: true },
  });
  if (!team) return false;
  const m = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: { userId, organizationId: team.organizationId },
    },
  });
  return !!m && orgRoleCanEditContent(m.role);
}

export async function getMembershipInOrg(userId: string, organizationId: number) {
  return prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}

export async function canUserManageInvites(
  userId: string,
  organizationId: number,
  platformRole: string
): Promise<boolean> {
  if (isPlatformAdmin(platformRole)) return true;
  const m = await getMembershipInOrg(userId, organizationId);
  return !!m && orgRoleIsOwner(m.role);
}

export async function requireTeamAccess(
  session: AuthedSession,
  teamId: number
): Promise<NextResponse | null> {
  const team = await getTeamInScope(teamId, session.user.id, session.user.role);
  if (!team) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  return null;
}

export async function requireTeamContentAccess(
  session: AuthedSession,
  teamId: number
): Promise<NextResponse | null> {
  /** Platform admins can create/update/delete all team-scoped content without org membership. */
  if (isPlatformAdmin(session.user.role)) {
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    return null;
  }
  const err = await requireTeamAccess(session, teamId);
  if (err) return err;
  const ok = await canUserEditContentForTeam(session.user.id, teamId, session.user.role);
  if (!ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function requireGroupAccess(
  session: AuthedSession,
  groupId: number
): Promise<{ group: { id: number; teamId: number } } | NextResponse> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true, teamId: true },
  });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  const teamErr = await requireTeamAccess(session, group.teamId);
  if (teamErr) return teamErr;
  return { group };
}

export async function requireGroupContentAccess(
  session: AuthedSession,
  groupId: number
): Promise<{ group: { id: number; teamId: number } } | NextResponse> {
  const r = await requireGroupAccess(session, groupId);
  if (r instanceof NextResponse) return r;
  const contentErr = await requireTeamContentAccess(session, r.group.teamId);
  if (contentErr) return contentErr;
  return r;
}

/** Resolve group from content folder (library root has groupId). */
export async function requireFolderAccess(
  session: AuthedSession,
  folderId: number
): Promise<{ teamId: number } | NextResponse> {
  const folder = await prisma.contentFolder.findUnique({
    where: { id: folderId },
    select: { id: true, groupId: true, parentId: true },
  });
  if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  if (folder.parentId == null && folder.groupId == null) {
    if (isPlatformAdmin(session.user.role)) {
      return { teamId: 0 };
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (folder.groupId != null) {
    const g = await prisma.group.findUnique({
      where: { id: folder.groupId },
      select: { teamId: true },
    });
    if (!g) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    const teamErr = await requireTeamAccess(session, g.teamId);
    if (teamErr) return teamErr;
    return { teamId: g.teamId };
  }
  if (folder.parentId == null) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }
  return requireFolderAccess(session, folder.parentId);
}

export async function requireFolderContentAccess(
  session: AuthedSession,
  folderId: number
): Promise<{ teamId: number } | NextResponse> {
  const r = await requireFolderAccess(session, folderId);
  if (r instanceof NextResponse) return r;
  if (r.teamId === 0) return r;
  const c = await requireTeamContentAccess(session, r.teamId);
  if (c) return c;
  return r;
}

export async function userHasAnyOrgMembership(userId: string): Promise<boolean> {
  const m = await prisma.organizationMember.findFirst({ where: { userId } });
  return !!m;
}

export async function effectiveTeamIdForDisplay(display: {
  teamId: number | null;
  groupId: number | null;
}): Promise<number | null> {
  if (display.teamId != null) return display.teamId;
  if (display.groupId == null) return null;
  const g = await prisma.group.findUnique({
    where: { id: display.groupId },
    select: { teamId: true },
  });
  return g?.teamId ?? null;
}
