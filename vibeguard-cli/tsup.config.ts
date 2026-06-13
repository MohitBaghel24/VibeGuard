import { defineConfig } from "tsup";
export default defineConfig({
  entry: {
    index: "src/cli/index.ts"
  },
  outDir: "dist",
  target: "es2022",
  platform: "node",
  format: ["esm"],
  bundle: true,
  splitting: false,
  sourcemap: true,
  minify: true,
  shims: true,
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
});
