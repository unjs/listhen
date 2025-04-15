import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      reporter: ["text", "clover", "json"],
      include: [
        "src/**/*.ts",
        "!src/cli.ts",
        "!src/lib/xdg-open.ts",
        "!src/lib/open.ts",
        "!src/server/*.ts",
      ],
    },
    globals: true,
    globalSetup: ["./test/setup.ts"],
  },
});
