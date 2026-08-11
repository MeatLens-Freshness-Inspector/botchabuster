import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: [
      "src/app/**/*.{ts,tsx}",
      "src/widgets/**/*.{ts,tsx}",
      "src/features/**/*.{ts,tsx}",
      "src/entities/**/*.{ts,tsx}",
      "src/shared/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/**"],
              message: "FSD layers must import shared or slice public APIs, not legacy components.",
            },
            {
              group: ["@/contexts/**"],
              message: "FSD layers must not import legacy contexts.",
            },
            {
              group: ["@/hooks/**"],
              message: "FSD layers must not import legacy hooks.",
            },
            {
              group: ["@/integrations/**"],
              message: "FSD layers must not import legacy integrations.",
            },
            {
              group: ["@/lib/**"],
              message: "FSD layers must not import legacy libraries.",
            },
          ],
        },
      ],
    },
  },
);
