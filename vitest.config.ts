import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      name: "geojson-loader",
      transform(code, id) {
        if (id.endsWith(".geojson")) {
          return { code: `export default ${code}`, map: null };
        }
      },
    },
  ],
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
