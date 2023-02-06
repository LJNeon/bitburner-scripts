import {defineConfig} from "viteburner";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: true,
  },
  viteburner: {
    watch: [{pattern: "src/**/*.ts", transform: true}],
    download: {
      server: "home",
      location: file => file.endsWith(".txt") ? `src/${file}` : null
    },
    dts: "./definitions.d.ts",
    port: 46937,
    sourcemap: false
  },
});
