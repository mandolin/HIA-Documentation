import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@hia-doc/core": fileURLToPath(new URL("./packages/core/src/index.ts", import.meta.url)),
      "@hia-doc/config": fileURLToPath(new URL("./packages/config/src/index.ts", import.meta.url)),
      "@hia-doc/plugin-sdk": fileURLToPath(new URL("./packages/plugin-sdk/src/index.ts", import.meta.url)),
      "@hia-doc/parser-jsdoc": fileURLToPath(new URL("./packages/parser-jsdoc/src/index.ts", import.meta.url)),
      "@hia-doc/lsp": fileURLToPath(new URL("./packages/lsp/src/index.ts", import.meta.url)),
      "@hia-doc/renderer-html": fileURLToPath(new URL("./packages/renderer-html/src/index.ts", import.meta.url)),
      "@hia-doc/theme-default": fileURLToPath(new URL("./packages/theme-default/src/index.ts", import.meta.url))
    }
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "tests/**/*.test.ts"],
    passWithNoTests: false
  }
});
