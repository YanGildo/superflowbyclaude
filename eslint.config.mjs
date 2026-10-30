// Fast lint tier. Everything here runs without type information, which is
// what keeps it quick enough for a pre-commit hook. The rules that need the
// type checker live in eslint.typed.config.mjs and run on their own script.
//
// Origem: vibe-coding-toolkit, prompt 08 (quality gates, MAX_LINES=350),
// adaptado ao Superflow e mesclado com o eslint.config.js anterior
// (react-hooks + react-refresh preservados).
//
// Severidades medidas na instalação (30/10/2026): regra com 0 violações = "error";
// regra com violações = "warn" + contagem (baseline). A migração de cada regra
// termina quando a contagem chega a zero e ela volta para "error".
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import importX from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

import quality from "./eslint-rules/index.cjs";

const testFiles = [
  "**/*{.,-}{test,spec}.{js,jsx,ts,tsx,mjs,cjs,mts,cts}",
  "**/{__tests__,__mocks__,fixtures,mocks}/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}",
];

export default defineConfig([
  {
    languageOptions: {
      parserOptions: { tsconfigRootDir: import.meta.dirname },
      // O app roda no navegador (Vite + React).
      globals: { ...globals.browser },
    },
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    // Regras do preset strict que tinham violações na instalação. Zeradas no burndown
    // (prompt 02, 30/10/2026): baselines 20 / 2 / 1 -> 0.
    rules: {
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/no-require-imports": "error",
    },
  },

  // React: o projeto usa hooks e Vite com React Refresh (já existiam no config anterior).
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["error", { allowConstantExport: true }], // baseline 11 -> 0
    },
  },

  {
    // import-x resolve o alias @/* do tsconfig, então no-unresolved é preciso.
    // Fronteiras de arquitetura do Superflow:
    //   telas (pages) -> componentes -> hooks/lib -> integrations
    plugins: { "import-x": importX },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver()],
    },
    rules: {
      "import-x/no-unresolved": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            // Componentes não dependem de telas.
            { target: "./src/components/**/*", from: "./src/pages/**/*" },
            // Camada de dados e regras não dependem de telas.
            { target: ["./src/hooks/**/*", "./src/lib/**/*", "./src/integrations/**/*"], from: "./src/pages/**/*" },
            // Telas não falam direto com o cliente do banco: usam os hooks (src/hooks).
            // (era dívida em warn, baseline 4 -> 0 no burndown de 30/10/2026)
            { target: "./src/pages/**/*", from: "./src/integrations/supabase/client.ts" },
            // Hooks e lib não dependem de componentes de UI.
            { target: ["./src/hooks/**/*", "./src/lib/**/*", "./src/integrations/**/*"], from: "./src/components/**/*" },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"],
    plugins: { quality },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-var": "error",
      "prefer-const": "error",
      "@typescript-eslint/no-unused-vars": [
        "error", // baseline 1 -> 0
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      complexity: ["warn", 12], // baseline: 22
      "max-depth": ["error", 4],
      "max-statements": ["warn", 20], // baseline: 4
      "max-params": ["error", 4],
      "max-lines-per-function": [
        "warn", // baseline: 3
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
      "max-nested-callbacks": ["error", 3],
      "quality/max-lines": ["error", { max: 350 }], // baseline 1 -> 0 (sidebar.tsx dividido em 30/10/2026)
      "quality/no-direct-console": [
        "error",
        { logger: "um helper de log do projeto (ainda não existe)" },
      ],
      "quality/no-direct-data-access": [
        "error", // baseline 5 -> 0 (acesso a dados movido para src/hooks e lib/*.ts)
        {
          modules: ["@/integrations/supabase/client"],
          bindings: ["supabase"],
          layers: ["/src/pages/", "/src/components/"],
          extensions: [".tsx"],
        },
      ],
    },
  },
  // Sem bloco de exceção para no-direct-console: o projeto não tem adaptador de log.
  {
    files: testFiles,
    plugins: { quality },
    rules: {
      "quality/max-lines": ["warn", { max: 350, includeTests: true }],
    },
  },
  {
    files: testFiles,
    rules: {
      "max-statements": "off",
      "max-lines-per-function": "off",
      "max-nested-callbacks": "off",
      "import-x/no-restricted-paths": "off",
    },
  },
  {
    // Arquivos de configuração e scripts na raiz rodam no Node, não no navegador.
    files: ["*.{js,mjs,cjs,ts}"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["eslint-rules/**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "readonly", require: "readonly" },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([
    ".claude/**",
    ".github/agents/**",
    ".github/hooks/**",
    ".github/skills/**",
    "node_modules/**",
    "dist/**",
    "build/**",
    "coverage/**",
    "**/*.tsbuildinfo",
    "package-lock.json",
    "src/generated/**",
  ]),
]);
