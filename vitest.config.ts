import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node"
  },
  resolve: {
    alias: {
      "@based/lang-core": path.resolve(__dirname, "packages/lang-core/src/index.ts"),
      "@based/stdlib": path.resolve(__dirname, "packages/stdlib/src/index.ts"),
      "@based/server-kit": path.resolve(__dirname, "packages/server-kit/src/index.ts"),
      "@based/web-ui": path.resolve(__dirname, "packages/web-ui/src/index.ts")
    }
  }
});
