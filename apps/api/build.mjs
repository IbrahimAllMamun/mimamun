import { cp, readFile, rm } from "node:fs/promises";
import { build } from "esbuild";

/**
 * Bundles the API into dist/. Workspace packages (@portfolio/shared) are
 * compiled in; npm dependencies stay external and are installed in the image.
 */
const pkg = JSON.parse(await readFile(new URL("./package.json", import.meta.url), "utf8"));
const external = Object.keys(pkg.dependencies ?? {}).filter(
  (name) => !name.startsWith("@portfolio/"),
);

await rm("dist", { recursive: true, force: true });
await build({
  entryPoints: {
    server: "src/server.ts",
    migrate: "src/database/migrate.ts",
    seed: "src/database/seed/index.ts",
  },
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  external,
  logLevel: "info",
});
await cp("src/database/migrations", "dist/migrations", { recursive: true });
