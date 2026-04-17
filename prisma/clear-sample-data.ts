/**
 * Removes all teams, groups, roster, scenes, schedules, displays, and content library data.
 * User accounts are kept so you can still sign in.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deleteContentFoldersBottomUp() {
  let batch = 1;
  while (batch > 0) {
    const r = await prisma.contentFolder.deleteMany({
      where: { children: { none: {} } },
    });
    batch = r.count;
  }
}

async function main() {
  await prisma.display.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.scene.deleteMany();
  await prisma.player.deleteMany();
  await prisma.contentAsset.deleteMany();
  await deleteContentFoldersBottomUp();
  await prisma.group.deleteMany();
  await prisma.team.deleteMany();

  console.log("Sample data cleared (users unchanged).");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
