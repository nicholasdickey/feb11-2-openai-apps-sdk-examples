/**
 * Build script for pizzaz widgets with inlined assets (JS + CSS embedded in HTML).
 * Used for single web service deployment (e.g. Render.com) - no external asset URLs.
 */
import { build, type InlineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import fg from "fast-glob";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import pkg from "./package.json" with { type: "json" };
import tailwindcss from "@tailwindcss/vite";

const entries = fg.sync("src/**/index.{tsx,jsx}");
const outDir = "assets";

const PIZZAZ_TARGETS = [
  "pizzaz",
  "pizzaz-carousel",
  "pizzaz-list",
  "pizzaz-albums",
  "pizzaz-shop",
];

const PER_ENTRY_CSS_GLOB = "**/*.{css,pcss,scss,sass}";
const PER_ENTRY_CSS_IGNORE = "**/*.module.*".split(",").map((s) => s.trim());
const GLOBAL_CSS_LIST = [path.resolve("src/index.css")];

function wrapEntryPlugin(
  virtualId: string,
  entryFile: string,
  cssPaths: string[]
): Plugin {
  return {
    name: `virtual-entry-wrapper:${entryFile}`,
    resolveId(id) {
      if (id === virtualId) return id;
    },
    load(id) {
      if (id !== virtualId) return null;
      const cssImports = cssPaths
        .map((css) => `import ${JSON.stringify(css)};`)
        .join("\n");
      return `
    ${cssImports}
    export * from ${JSON.stringify(entryFile)};
    import * as __entry from ${JSON.stringify(entryFile)};
    export default (__entry.default ?? __entry.App);
    import ${JSON.stringify(entryFile)};
  `;
    },
  };
}

fs.rmSync(outDir, { recursive: true, force: true });

const builtNames: string[] = [];

for (const file of entries) {
  const name = path.basename(path.dirname(file));
  if (!PIZZAZ_TARGETS.includes(name)) continue;

  const entryAbs = path.resolve(file);
  const entryDir = path.dirname(entryAbs);

  const perEntryCss = fg.sync(PER_ENTRY_CSS_GLOB, {
    cwd: entryDir,
    absolute: true,
    dot: false,
    ignore: PER_ENTRY_CSS_IGNORE,
  });
  const globalCss = GLOBAL_CSS_LIST.filter((p) => fs.existsSync(p));
  const cssToInclude = [...globalCss, ...perEntryCss].filter((p) =>
    fs.existsSync(p)
  );
  const virtualId = `\0virtual-entry:${entryAbs}`;

  const createConfig = (): InlineConfig => ({
    plugins: [
      wrapEntryPlugin(virtualId, entryAbs, cssToInclude),
      tailwindcss(),
      react(),
      {
        name: "remove-manual-chunks",
        outputOptions(options) {
          if ("manualChunks" in options) {
            delete (options as Record<string, unknown>).manualChunks;
          }
          return options;
        },
      },
    ],
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react",
      target: "es2022",
    },
    build: {
      target: "es2022",
      outDir,
      emptyOutDir: false,
      chunkSizeWarningLimit: 2000,
      minify: "esbuild",
      cssCodeSplit: false,
      rollupOptions: {
        input: virtualId,
        output: {
          format: "es",
          entryFileNames: `${name}.js`,
          inlineDynamicImports: true,
          assetFileNames: (info) =>
            (info.name || "").endsWith(".css")
              ? `${name}.css`
              : `[name]-[hash][extname]`,
        },
        preserveEntrySignatures: "allow-extension",
        treeshake: true,
      },
    },
  });

  console.log(`Building ${name}...`);
  await build(createConfig());
  builtNames.push(name);
}

const outputs = fs
  .readdirSync(outDir)
  .filter((f) => f.endsWith(".js") || f.endsWith(".css"))
  .map((f) => path.join(outDir, f))
  .filter((p) => fs.existsSync(p));

const h = crypto
  .createHash("sha256")
  .update(pkg.version, "utf8")
  .digest("hex")
  .slice(0, 4);

for (const out of outputs) {
  const dir = path.dirname(out);
  const ext = path.extname(out);
  const base = path.basename(out, ext);
  const newName = path.join(dir, `${base}-${h}${ext}`);
  fs.renameSync(out, newName);
}

// Generate HTML with inlined JS and CSS (no external URLs)
for (const name of builtNames) {
  const jsPath = path.join(outDir, `${name}-${h}.js`);
  const cssPath = path.join(outDir, `${name}-${h}.css`);

  if (!fs.existsSync(jsPath) || !fs.existsSync(cssPath)) {
    throw new Error(`Missing built files for ${name}`);
  }

  const jsContent = fs.readFileSync(jsPath, "utf8");
  const cssContent = fs.readFileSync(cssPath, "utf8");

  const html = `<!doctype html>
<html>
<head>
  <style>${cssContent}</style>
</head>
<body>
  <div id="${name}-root"></div>
  <script type="module">${jsContent}</script>
</body>
</html>
`;

  const hashedHtmlPath = path.join(outDir, `${name}-${h}.html`);
  const liveHtmlPath = path.join(outDir, `${name}.html`);
  fs.writeFileSync(hashedHtmlPath, html, { encoding: "utf8" });
  fs.writeFileSync(liveHtmlPath, html, { encoding: "utf8" });
  console.log(`Inlined ${name}.html`);
}

// Clean up standalone .js and .css (no longer needed; content is in HTML)
for (const name of builtNames) {
  const jsPath = path.join(outDir, `${name}-${h}.js`);
  const cssPath = path.join(outDir, `${name}-${h}.css`);
  if (fs.existsSync(jsPath)) fs.unlinkSync(jsPath);
  if (fs.existsSync(cssPath)) fs.unlinkSync(cssPath);
}

console.log("Pizzaz inlined build complete.");
