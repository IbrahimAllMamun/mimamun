import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schema/index.ts",
  out: "./src/database/migrations",
  casing: "snake_case",
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://portfolio:portfolio@localhost:5432/portfolio",
  },
});
