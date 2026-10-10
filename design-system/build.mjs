// Builds dist/ for design-sync: ESM bundle, one stylesheet, and .d.ts for the primitives.
// SCSS modules are compiled with the app's own `sass`; esbuild turns the result into CSS modules.
import { build } from "esbuild";
import * as sass from "sass";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const dist = path.join(here, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const scssModules = {
  name: "scss-modules",
  setup(b) {
    b.onLoad({ filter: /\.module\.scss$/ }, (args) => {
      const out = sass.compile(args.path, { loadPaths: [path.join(root, "src")], quietDeps: true, silenceDeprecations: ["import", "global-builtin", "mixed-decls"] });
      return { contents: out.css, loader: "local-css" };
    });
  },
};

await build({
  entryPoints: [path.join(here, "src/index.ts")],
  outfile: path.join(dist, "index.es.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  external: ["react", "react-dom", "react/jsx-runtime"],
  alias: { "next/link": path.join(here, "src/shims/link.tsx"), "@": path.join(root, "src") },
  plugins: [scssModules],
  logLevel: "info",
});

// tokens: the :root blocks of _tokens.scss, compiled as-is
const tokens = sass.compile(path.join(root, "src/styles/_tokens.scss")).css;
const fonts = '@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800&family=Geist+Mono:wght@400;500&display=swap");\n';
const base = `html{--font-geist-sans:"Geist";--font-geist-mono:"Geist Mono"}\nbody{margin:0;background:var(--db-bg);color:var(--db-text-primary);font-family:"Geist",-apple-system,system-ui,sans-serif;-webkit-font-smoothing:antialiased}\nbutton{font-family:inherit}\na{text-decoration:none}\n`;
const components = readFileSync(path.join(dist, "index.es.css"), "utf8");
writeFileSync(path.join(dist, "style.css"), `${fonts}${tokens}\n${base}\n${components}`);

// declarations
execFileSync(path.join(root, "node_modules/.bin/tsc"), ["-p", path.join(here, "tsconfig.dts.json")], { stdio: "inherit" });
const fixImports = (dir) => {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) { fixImports(p); continue; }
    if (!p.endsWith(".d.ts")) continue;
    let s = readFileSync(p, "utf8");
    s = s.replace(/from "@\/([^"]+)"/g, (_, rest) => `from "${path.relative(path.dirname(p), path.join(dist, "types/src", rest)).split(path.sep).join("/").replace(/^(?!\.)/, "./")}"`);
    writeFileSync(p, s);
  }
};
fixImports(path.join(dist, "types"));
writeFileSync(path.join(dist, "index.d.ts"), 'export * from "./types/design-system/src/index";\n');
console.log("built", readdirSync(dist));
