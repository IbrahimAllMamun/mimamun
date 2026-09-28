// ESLint flat config for the whole monorepo.
import js from "@eslint/js";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import globals from "globals";
import tseslint from "typescript-eslint";

const WEB_FILES = ["apps/web/**/*.{ts,tsx,js,jsx,mjs}"];

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/next-env.d.ts",
      "**/coverage/**",
      "playwright-report/**",
      "test-results/**",
      "apps/api/src/database/migrations/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      eqeqeq: ["error", "smart"],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  // Next.js, React, hooks and accessibility rules for the web app only.
  ...[...nextCoreWebVitals, ...nextTypescript].map((config) => ({ ...config, files: WEB_FILES })),
  {
    files: WEB_FILES,
    languageOptions: { globals: { ...globals.browser } },
    settings: { next: { rootDir: "apps/web" }, react: { version: "19" } },
  },
  {
    // Scripts and tooling may log.
    files: [
      "**/*.config.{ts,mjs,js}",
      "apps/api/build.mjs",
      "scripts/**",
      "apps/api/src/database/**",
    ],
    rules: { "no-console": "off" },
  },
);
