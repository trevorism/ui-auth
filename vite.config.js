import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(import.meta.dirname, "src/index.js"),
      name: "ui-auth",
      fileName: (format) => `ui-auth.${format}.js`,
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
