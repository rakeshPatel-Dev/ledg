import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // The repository test shares one Mongo test database, so run files in
    // sequence instead of racing on the same collections.
    fileParallelism: false,
  },
});
