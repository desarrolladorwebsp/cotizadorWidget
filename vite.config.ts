import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/loader.ts"),
      name: "CotizadorWidget",
      formats: ["iife"],
      fileName: () => "cotizador-widget.js",
    },
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true,
      },
    },
    minify: "esbuild",
    sourcemap: true,
    emptyOutDir: true,
  },
  server: {
    port: 3002,
    open: "/demo.html",
  },
  publicDir: "public",
});
