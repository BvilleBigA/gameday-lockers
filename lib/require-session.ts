import { auth } from "@/auth";
import type { Session } from "next-auth";
import type { SessionOrgMembership } from "@/types/next-auth";
import { NextResponse } from "next/server";

export type AuthedSession = Session & {
  user: NonNullable<Session["user"]> & {
    id: string;
    role: string;
    orgMemberships: SessionOrgMembership[];
  };
};

export async function requireAuth(): Promise<
  { ok: true; session: AuthedSession } | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = session.user.role;
  if (!role) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, session: session as AuthedSession };
}

export async function requireAdmin(): Promise<
  { ok: true; session: AuthedSession } | { ok: false; response: NextResponse }
> {
  const r = await requireAuth();
  if (!r.ok) return r;
  if (r.session.user.role !== "ADMIN") {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return r;
}
