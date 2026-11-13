import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    // Modules that build clients at import time (e.g. Resend) must not depend
    // on a real deployment secret while unit tests are loading them.
    env: {
      RESEND_API_KEY: "re_test_key",
    },
    // The repository test shares one Mongo test database, so run files in
    // sequence instead of racing on the same collections.
    fileParallelism: false,
  },
});
