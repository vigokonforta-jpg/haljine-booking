import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  // Vercel Postgres sets POSTGRES_URL (pooled); fall back to DATABASE_URL for local dev
  const connectionString = (process.env.POSTGRES_URL ?? process.env.DATABASE_URL)!;
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
