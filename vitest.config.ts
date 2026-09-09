import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: [
      "lib/**/*.test.{ts,tsx}",
      "emails/**/*.test.{ts,tsx}",
      "tests/unit/**/*.test.{ts,tsx}",
    ],
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
});
