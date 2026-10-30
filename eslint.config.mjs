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
    // Regras do preset strict com violações na instalação (as demais seguem em "error").
    rules: {
      "@typescript-eslint/no-non-null-assertion": "warn", // baseline: 20
      "@typescript-eslint/no-empty-object-type": "warn", // baseline: 2 (components/ui, shadcn)
      "@typescript-eslint/no-require-imports": "warn", // baseline: 1 (tailwind.config.ts)
    },
  },

  // React: o projeto usa hooks e Vite com React Refresh (já existiam no config anterior).
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }], // já era warn; contagem atual: 11
    },
  },

  {
    // import-x resolve o alias @/* do tsconfig, então no-unresolved é preciso.
    // Fronteiras de arquitetura do Superflow:
    //   telas (pages) -> componentes -> hooks/lib -> integrations
    plugins: { "import-x": importX, "import-x-debt": importX },
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
          ],
        },
      ],
      // Dívida de fronteira já existente (warn). Corrija e promova a zona para o bloco acima.
      // baseline: 4 (3 telas importam o cliente do banco + hooks/use-toast importa components/ui)
      "import-x-debt/no-restricted-paths": [
        "warn",
        {
          zones: [
            // Telas não falam direto com o cliente do banco: usam os hooks (src/hooks).
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
        "warn", // baseline: 1 (antes estava "off")
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
      "quality/max-lines": ["warn", { max: 350 }], // baseline: 1 (src/components/ui/sidebar.tsx, 620 linhas)
      "quality/no-direct-console": [
        "error",
        { logger: "um helper de log do projeto (ainda não existe)" },
      ],
      "quality/no-direct-data-access": [
        "warn", // baseline: 5 (lib/auth.tsx, lib/workspace.tsx, pages/Configuracoes, Equipe, Lixeira)
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
      "import-x-debt/no-restricted-paths": "off",
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
