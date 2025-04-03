import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      reporter: ["text", "clover", "json"],
      include: ["src/**/*.ts"],
    },
    globals: true,
    globalSetup: ["./test/setup.ts"],
  },
});
