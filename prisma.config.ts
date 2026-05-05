import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma Postgres sets PRISMA_DATABASE_URL; fall back to DATABASE_URL for local dev
    url: (process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL)!,
  },
});
