import { PrismaClient } from "@/app/generated/prisma/client";

function createClient() {
  // Prisma Postgres (Accelerate) uses a prisma+postgres:// URL — must use accelerateUrl,
  // not @prisma/adapter-pg (pg driver doesn't understand the prisma+postgres:// protocol).
  const accelerateUrl = (process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL)!;
  return new PrismaClient({ accelerateUrl });
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: ReturnType<typeof createClient> | undefined;
}

const prisma = globalThis.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
