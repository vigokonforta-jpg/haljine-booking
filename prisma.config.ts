import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Vercel Postgres sets POSTGRES_URL_NON_POOLING (direct connection required for migrations)
    // Fall back to DATABASE_URL for local dev and other providers
    url: (process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL)!,
  },
});
