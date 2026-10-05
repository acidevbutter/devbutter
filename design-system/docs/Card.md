---
category: Display
---
Card is the admin surface for tiles, linked records and grouped fields: a 1px outlined `--admin-card` box with radius 12px and 14px padding. `Label` is its small uppercase mono caption.

Use Card for a self-contained group (a client summary, a stat, a form block) on an `--admin-panel` or `--db-bg` background. Put a `Label` above the content to name it; write the label text in lowercase, CSS uppercases it.

```tsx
<Card>
  <Label>cliente vinculado</Label>
  <div style={{ fontWeight: 600 }}>Ateliê Corvo</div>
</Card>
```

Props: `Card` takes `className` and `children`; `Label` takes `children`. For anything else (padding, width, grid placement) wrap it or pass a `className`.
