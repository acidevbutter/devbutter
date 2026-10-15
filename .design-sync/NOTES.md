# design-sync notes (DevButter)

- The app is a private Next.js app, not a component library. `design-system/` is a tiny package that compiles the real admin primitives (`src/components/admin/ui`: Button, Badge, Card + Label) into `design-system/dist/` for the converter. Rebuild it first: `node design-system/build.mjs` (esbuild + the app's `sass`; `next/link` is shimmed to a plain `<a>`; `esbuild` is installed inside `design-system/`, not in the app's package.json).
- Run the converter from the repo root: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --entry design-system/dist/index.es.js --out ./ds-bundle` (pass the repo-root `node_modules`: React lives there). Stage `.ds-sync/` from the skill and `npm i esbuild ts-morph @types/react playwright@1.63.0` inside it (1.63.0 matches the cached chromium-1243).
- Preview cards are drawn on a white canvas, so every authored story wraps itself in a dark stage (`var(--db-bg)`); keep that when adding stories.
- `cardMode: column` is set for Badge and Card (wide stories).
- Docs are `design-system/docs/*.md` (frontmatter `category`); they are written for the design agent, not copied from the Design System artifact.
- `dist/style.css` = Geist/Geist Mono Google Fonts `@import` + the `:root` tokens from `_tokens.scss` + a small base (body ground, `a{text-decoration:none}`) + the compiled component CSS.
- Only 4 components exist. Panels, tables, chips, tabs, fields are SCSS mixins/page CSS in the app, not components; they are documented in the Design System artifact (https://claude.ai/artifact/GF3tYoCLcCMjbBJd6e57qQ), and the conventions header tells the agent to build them from tokens.

## Known render warns
- `[FONT_REMOTE]`: Geist/Geist Mono come from a Google Fonts `@import` at runtime. Expected.

## Re-sync risks
- Button/Badge/Card edits in `src/components/admin/ui` need `node design-system/build.mjs` before the converter, or the sync ships stale code.
- `dist/index.d.ts` is emitted with `tsc` and imports `BadgeTone` from `src/lib/admin/format.ts`; if that file moves, the build script's import rewrite breaks.
- The conventions header names tokens from `src/styles/_tokens.scss`; re-run the name check if tokens are renamed.
- Styling bugs in the app are mirrored by the package (for example the Badge needs `justifySelf: 'start'` in grids); see GitHub issues #22, #23 and #30.
