import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["dist/**/*"],
  },
  {
    files: ["src/**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["scripts/**/*.{js,ts,gs}"],
    plugins: { js },
    extends: ["js/recommended"],
  },
  {
    files: ["**/*.{ts,mts,cts}"],
    plugins: { tseslint },
    extends: ["tseslint/strictTypeChecked", "tseslint/stylisticTypeChecked"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
]);
