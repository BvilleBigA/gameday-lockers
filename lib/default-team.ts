import { prisma } from "@/lib/prisma";

/** First team in DB, or create org + facility team (bootstrap). */
export async function getDefaultTeamId(): Promise<number> {
  const first = await prisma.team.findFirst({ orderBy: { id: "asc" } });
  if (first) return first.id;
  const org = await prisma.organization.create({
    data: { name: "Default organization" },
  });
  const t = await prisma.team.create({
    data: { name: "Facility", organizationId: org.id },
  });
  return t.id;
}
