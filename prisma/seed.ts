import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "andersonhlong@icloud.com").toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD ?? "ChangeMeOnFirstLogin!";

async function main() {
  await prisma.display.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.scene.deleteMany();
  await prisma.player.deleteMany();
  await prisma.group.deleteMany();
  await prisma.team.deleteMany();
  await prisma.organizationInvite.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: { name: "Demo organization" },
  });

  const team = await prisma.team.create({
    data: { name: "Football", organizationId: org.id },
  });

  const offense = await prisma.group.create({
    data: { name: "Offense", teamId: team.id },
  });

  await prisma.group.create({
    data: { name: "Defense", teamId: team.id },
  });

  await prisma.player.create({
    data: {
      firstName: "Marcus",
      lastName: "Johnson",
      number: "12",
      position: "QB",
      imageUrl:
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80",
      teamId: team.id,
      groupId: offense.id,
    },
  });

  await prisma.player.create({
    data: {
      firstName: "Jordan",
      lastName: "Lee",
      number: "7",
      position: "WR",
      imageUrl:
        "https://images.unsplash.com/photo-1517649763962-0c62306601b7?w=400&q=80",
      teamId: team.id,
      groupId: offense.id,
    },
  });

  const passwordHash = await hash(ADMIN_PASSWORD, 12);
  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      role: "ADMIN",
      ...(process.env.ADMIN_SEED_PASSWORD ? { passwordHash } : {}),
    },
    create: {
      email: ADMIN_EMAIL,
      name: "Site admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: { userId: adminUser.id, organizationId: org.id },
    },
    update: { role: "OWNER" },
    create: {
      userId: adminUser.id,
      organizationId: org.id,
      role: "OWNER",
    },
  });

  console.log(
    "Seed complete: Team, Groups, Players, admin user. Wall layouts: Groups → Save as scene (title only). Facility scenes: Admin → Scenes / schedules."
  );
  console.log(`Admin login: ${ADMIN_EMAIL} (password from ADMIN_SEED_PASSWORD or default ChangeMeOnFirstLogin!)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
