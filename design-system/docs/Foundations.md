---
category: Foundations
---
Foundations are the tokens in `src/styles/_tokens.scss`. Each one carries brand meaning, so pick a token by **what it says**, not by how it looks. The brand reasoning lives in `.claude/brand-voice-guidelines.md` §9 (superproject root).

## Colour: two accents, two meanings

> "Verde é o sinal indo; rosa é a correção voltando." — /metodo

The illustrations use the same physics: pink disordered particles organise into green channels (statistical mechanics, disorder producing order and information), and a pink mass curves the green mesh (the problem has mass; the solution adapts to the curvature). Keep that direction: pink is where things start, green is where they settle.

| Token (SCSS / CSS) | Means | Use for | Never |
|---|---|---|---|
| `$signal` / `--signal` (= `#79e59b`) | the signal, the action, the solution | primary CTA, links, focus ring, "done" | errors |
| `$signal-glow` (= `#00d26a`) | the same, lit | CTA glow, live dot | text |
| `$problem` / `--problem` (= `#f64c6f`) | the problem, the correction | the one problem-word in a headline, errors, overdue, destructive actions | primary CTA |
| `$problem-glow` (= `#ff4fa3`) | the same, lit | illustration, selection | text on dark at small sizes |

Raw `$db-green` / `$db-pink` stay for illustration and editorial emphasis. When the colour is *saying* something, use the semantic name.

One element, one accent. Green and pink share equal weight only in the flask logomark.

### Status (functional, not brand)

| Token | State | Example words |
|---|---|---|
| `$status-done` / `--status-done` | finished, paid, approved | paga, aprovado, concluído |
| `$status-wait` / `--status-wait` (`#e5b75a`) | waiting on someone | pendente, em revisão, aguardando |
| `$status-alert` / `--status-alert` | needs action now | vencida, recusado, falhou |
| `$status-neutral` / `--status-neutral` | informational | reembolsada, editado |

Amber exists only here. It never appears on the marketing site and is never decorative. A status is always written in words: green and pink differ by only 2.2:1, so colour reinforces the word and never replaces it.

`$admin-amber` / `--admin-amber` are **deprecated aliases** of `$status-wait`, kept so nothing breaks while the migration finishes. Don't use them in new code.

## Type: two voices

| Family | Token | Voice | Use for |
|---|---|---|---|
| Geist Sans | `$font-sans` | the human voice | headings, body, conversation, buttons |
| Geist Mono | `$font-mono` | the voice of the record | metadata, status, eyebrows, ids, money, dates |

Always reach the fonts through `$font-mono` / `var(--font-geist-mono)`. A literal `"Geist Mono"` skips `next/font` and falls back to the visitor's installed fonts. The one exception is canvas text (`Scenes/motion2d.ts`): canvas can't read CSS variables.

**Scale**, by role:

| Token | Size | Role |
|---|---|---|
| `$fs-micro` | 10px | mono micro-label, badge |
| `$fs-label` | 11px | mono label, metadata, field hint |
| `$fs-eyebrow` | 12px | eyebrow, caption |
| `$fs-small` | 13px | secondary UI text, card body |
| `$fs-ui` | 13.5px | buttons, inputs, table cells |
| `$fs-body-sm` | 14px | dense body, nav links |
| `$fs-body` | 16px | reading text, intro |
| `$fs-card-title` | 17px | card titles |
| `$fs-title-sm` | 20px | panel and section titles in the app |
| `$fs-title` | 22px | page titles in the app |

Editorial display sizes stay fluid in the `_site.scss` mixins (`h2`, `page-title`). When you touch a file, move half-pixel one-offs (11.5, 12.5, 10.5) to the nearest step.

## Motion

The product moves like a physical system relaxing to equilibrium along its most economical path: it decelerates into place and never moves linearly or robotically. Nothing flashes to get attention. Pick a duration by **what moves**:

| Token | Value | What moves |
|---|---|---|
| `$mo-instant` / `--mo-instant` | 100ms | colour or opacity feedback (press, toggle tick) |
| `$mo-quick` / `--mo-quick` | 160ms | hover, focus, border, glow, card lift |
| `$mo-base` / `--mo-base` | 260ms | small things entering or leaving (tooltip, chip, toast) |
| `$mo-slow` / `--mo-slow` | 420ms | panels, drawers, dialogs, message reveal |
| `$mo-deliberate` / `--mo-deliberate` | 700ms | editorial entrances (hero and page-title fade-up) |

Easings: `$ease-out` by default, `$ease-spring` for things that land (pop, rise). Illustration loops (rings, floaty, pulses) keep their own long periods and are not UI motion. Every animation needs a `prefers-reduced-motion` branch that shows the end state; the `fade-up` mixin is the reference.

**Migrating old values:** 0.12–0.2s → `$mo-quick`; 0.22–0.32s → `$mo-base`; 0.4–0.5s → `$mo-slow`; 0.7s → `$mo-deliberate`.

## Focus

One ring for the whole product, declared once in `globals.scss`: 2px `$focus-ring-color` (signal green), 2px offset, on every `a`, `button`, `input`, `select`, `textarea`, `summary` and focusable `[tabindex]`. It uses `:where()`, so a component that draws its own focus treatment (like the input's border and halo) still wins. **Never remove focus without replacing it.**

## Shape, depth, layers

Radius, shadows, glows, z-index and breakpoints are unchanged; see `_tokens.scss` (`$r-*`, `$shadow-*`, `$glow-*`, `$z-*`, `$bp-*`). Surfaces rise by luminance (`--db-bg` → `--admin-panel` → `--admin-card`), not by hue. Glows are green for action and pink for a problem, never both on one element.
