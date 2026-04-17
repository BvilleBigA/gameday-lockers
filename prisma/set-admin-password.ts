/**
 * Update only the admin password (does not reset teams/scenes/displays).
 * Usage: ADMIN_PASSWORD='your-password' npx tsx prisma/set-admin-password.ts
 */
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "andersonhlong@icloud.com").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    console.error("Set ADMIN_PASSWORD (min 8 characters), e.g.:");
    console.error(`  ADMIN_PASSWORD='…' npx tsx prisma/set-admin-password.ts`);
    process.exit(1);
  }

  const passwordHash = await hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      name: "Site admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log(`Password updated for ${user.email}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
