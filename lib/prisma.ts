import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const log: Prisma.LogLevel[] =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

function createPrismaClient() {
  return new PrismaClient({ log });
}

const codegenIncludesWallScenes =
  typeof Prisma.ModelName === "object" &&
  Prisma.ModelName != null &&
  "WallSceneSnapshot" in Prisma.ModelName;

const codegenIncludesOrganization =
  typeof Prisma.ModelName === "object" &&
  Prisma.ModelName != null &&
  "Organization" in Prisma.ModelName;

/** Reject cached or freshly constructed clients that don’t match current schema (common after HMR / partial restarts). */
function hasRequiredDelegates(c: PrismaClient | undefined): c is PrismaClient {
  if (c == null) return false;
  const contentFolder = (c as unknown as { contentFolder?: { create: unknown } }).contentFolder;
  if (typeof contentFolder?.create !== "function") return false;
  if (codegenIncludesWallScenes) {
    const ws = (c as unknown as { wallSceneSnapshot?: { findMany: unknown } }).wallSceneSnapshot;
    if (typeof ws?.findMany !== "function") return false;
  }
  if (codegenIncludesOrganization) {
    const o = (c as unknown as { organization?: { findMany: unknown } }).organization;
    if (typeof o?.findMany !== "function") return false;
  }
  return true;
}

function getClient(): PrismaClient {
  if (hasRequiredDelegates(globalForPrisma.prisma)) {
    return globalForPrisma.prisma;
  }
  globalForPrisma.prisma = undefined;
  const client = createPrismaClient();
  if (!hasRequiredDelegates(client)) {
    throw new Error(
      "Prisma Client is out of date. Run: npx prisma generate — then restart the dev server."
    );
  }
  globalForPrisma.prisma = client;
  return client;
}

/**
 * Lazy proxy so we replace a stale `globalThis.prisma` after codegen without restarting the process.
 * Use the real client as Reflect receiver: Prisma’s model accessors rely on `this` being the
 * PrismaClient instance; passing the Proxy (default receiver) yields undefined delegates.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});
