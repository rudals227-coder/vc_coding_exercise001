import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    passWithNoTests: true,
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
