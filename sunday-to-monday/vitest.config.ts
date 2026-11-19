import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import path from "node:path";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("Set TEST_DATABASE_URL (a throwaway database, the tests wipe it).");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // "server-only" throws outside the Next server bundle; it's a no-op in tests.
      "server-only": path.resolve(__dirname, "tests/empty.ts"),
    },
  },
  test: {
    env: { DATABASE_URL: testUrl },
    fileParallelism: false,
    include: ["tests/**/*.test.ts"],
  },
});
