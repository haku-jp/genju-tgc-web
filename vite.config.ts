import { defineConfig } from "vitest/config";

export default defineConfig({
  server: {
    host: true,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
