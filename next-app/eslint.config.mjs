import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "_build/**",
    "_research/**",
    "_wire/**",
    "platform/**",
    "product/**",
    "universe/**",
    "*.html",
    "test-results/**",
    "playwright-report/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
