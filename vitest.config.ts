import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      reporter: ["text", "clover", "json"]
    },
    globals: true,
    globalSetup: [
      "./test/setup.ts"
    ]
  }
});
