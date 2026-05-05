import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  // Prisma Postgres sets PRISMA_DATABASE_URL; fall back to DATABASE_URL for local dev
  const connectionString = (process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL)!;
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter } as never);
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
