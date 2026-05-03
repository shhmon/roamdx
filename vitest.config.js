import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/web/lib/**/*.test.js"],
    environment: "node",
  },
});
