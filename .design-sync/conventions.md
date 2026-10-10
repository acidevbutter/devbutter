# Building with @devbutter/ui

DevButter is a dark-only, Brazilian-Portuguese product. `window.DevButter` exposes four parts: `Button`, `Badge`, `Card` and `Label`. Everything else in a DevButter screen (panels, tables, tabs, chips, fields) is plain layout you write yourself with the tokens below; do not invent more components.

## Setup
No provider or wrapper is needed. Load `styles.css`: it imports the Geist and Geist Mono fonts, defines the `--db-*` and `--admin-*` custom properties and sets `body` to the dark ground. Never put a light background behind these components: outline buttons, badges and card borders are white-on-transparent and disappear on white.

## Styling idiom
The components ship CSS-module class names that you cannot reference. Style your own markup with inline styles and `var(--token)` values, never raw hex or new `rgba()`.
- Surfaces: `--db-bg` (page), `--admin-panel` (lists, shells), `--admin-card` (tiles, fields), `--db-surface`.
- Text: `--db-text-primary`, `--db-text-secondary`, `--admin-text-2` (admin meta), `--db-text-muted` (mono labels only; it is low contrast).
- Accent: `--db-green` positive or primary action, `--db-pink` attention or error, `--admin-amber` waiting. Hairlines: `--db-border`, `--db-border-interactive`.
- Type: Geist for content; `var(--font-geist-mono)` for ids, money, dates and small labels. Page titles 20px/600, table cells 13px, mono labels 10px uppercase.
- Shape: panels radius 16px, cards 12px, controls 8 to 10px, pills 20px. Separate surfaces with 1px hairlines, not shadows.

## Components
- `Button`: `variant` solid (one primary per screen) | outline | danger; `size` md | sm | row (in-table). With `href` it renders an anchor and ignores `onClick` and `disabled`.
- `Badge`: `tone` green | amber | pink | pinkFilled | neutral; `size` sm (rows) | md (headers). Always write the state in words. In a grid cell add `style={{ justifySelf: 'start' }}`.
- `Card` + `Label`: bordered 14px-padded box with a lowercase caption (CSS uppercases it).

## Example
```tsx
<div style={{ background: 'var(--admin-panel)', border: '1px solid var(--db-border)', borderRadius: 16 }}>
  <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr .8fr', gap: 12, padding: '13px 16px', alignItems: 'center', fontSize: 13 }}>
    <span style={{ fontWeight: 600 }}>Ateliê Corvo</span>
    <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--admin-text-2)' }}>R$ 4.800</span>
    <Badge tone="amber" style={{ justifySelf: 'start' }}>pendente</Badge>
  </div>
</div>
<Button size="sm">+ Novo quote manual</Button>
```

Copy: sentence case, verb first ("Salvar alterações"); pending labels end in an ellipsis ("Aprovando…"); empty states are one sentence with a period.
