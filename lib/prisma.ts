import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  const databaseUrl = process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing PRISMA_DATABASE_URL or DATABASE_URL");
  }

  if (databaseUrl.startsWith("prisma+postgres://")) {
    return new PrismaClient({ accelerateUrl: databaseUrl });
  }

  return new PrismaClient({
    adapter: new PrismaPg(databaseUrl),
  });
}

declare global {
  var prisma: ReturnType<typeof createClient> | undefined;
}

const prisma = globalThis.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
