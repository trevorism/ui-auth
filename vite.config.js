import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    sourcemap: true,
    lib: {
      entry: resolve(import.meta.dirname, "src/index.js"),
      name: "TrevorismUiAuth",
      fileName: (format) => (format === "umd" ? "ui-auth.umd.cjs" : "ui-auth.es.js"),
    },
    rollupOptions: {
      external: ["vue", "vue-router", "axios"],
      output: {
        globals: {
          vue: "Vue",
          "vue-router": "VueRouter",
          axios: "axios",
        },
      },
    },
  },
  test: {
    setupFiles: resolve(import.meta.dirname, "test/setup.js"),
  },
});
