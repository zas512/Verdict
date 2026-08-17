// @ts-check
import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["eslint.config.mjs", "prettier.config.js", "prisma/**", "dist/**"]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      },
      sourceType: "commonjs",
      parserOptions: {
        projectService: {
          allowDefaultProject: ["prisma/*.ts", "*.config.ts"]
        },
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn"
    }
  }
];
