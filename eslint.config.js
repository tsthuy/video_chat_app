import eslintPluginPrettier from "eslint-plugin-prettier"

import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"

import simpleImportSort from "eslint-plugin-simple-import-sort"
import checkFile from "eslint-plugin-check-file"
import unusedImports from "eslint-plugin-unused-imports"

export default tseslint.config(
  { ignores: ["dist", "vite.config.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      prettier: eslintPluginPrettier,
      "simple-import-sort": simpleImportSort,
      "check-file": checkFile,
      "unused-imports": unusedImports
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "prettier/prettier": [
        "warn",
        {
          arrowParens: "always",
          semi: false,
          trailingComma: "none",
          tabWidth: 2,
          endOfLine: "auto",
          useTabs: false,
          singleQuote: false,
          printWidth: 120,
          jsxSingleQuote: true
        }
      ],
      "no-var": "error",
      "prefer-const": "error",
      "simple-import-sort/imports": "error",
      "check-file/filename-naming-convention": ["error", { "**/*.{ts,tsx}": "KEBAB_CASE" }],
      "check-file/folder-naming-convention": ["error", { "src/**/*": "KEBAB_CASE" }],
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_"
        }
      ]
    }
  },

  {
    files: ["**/{hooks,utils,services,components,constants,libs,types,stores,mocks}/*.ts"],
    rules: {
      "check-file/filename-naming-convention": [
        "error",
        {
          "**/hooks/**/*.ts": "use-**.hook",
          "**/utils/**/*.ts": "**.util",
          "**/services/**/*.ts": "**.service",
          "**/components/**/*.ts": "**.component",
          "**/constants/**/*.ts": "**.const",
          "**/libs/**/*.ts": "**.lib",
          "**/types/**/*.ts": "**.d",
          "**/stores/**/*.ts": "**.store",
          "**/mocks/**/*.ts": "**.mock"
        }
      ]
    }
  },

  {
    files: ["src/**/index.ts", "src/**/App.tsx", "/types**"],
    rules: {
      "check-file/filename-naming-convention": "off",
      "check-file/folder-naming-convention": "off"
    }
  }
)
