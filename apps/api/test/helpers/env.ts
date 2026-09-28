/** Test database URL. Override with TEST_DATABASE_URL (CI sets it to its service container). */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://portfolio:portfolio@localhost:5432/portfolio_test";

export const TEST_ORIGIN = "http://localhost:3000";
