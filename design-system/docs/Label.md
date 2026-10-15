---
category: Display
---
Label is the small uppercase mono caption that names a Card or a form block ("cliente vinculado", "faixa de preço").

Write the text in lowercase; CSS uppercases it with 0.1em letter-spacing and `--db-text-muted` color. Place it directly above the content it names, inside the Card.

```tsx
<Card>
  <Label>faixa de preço</Label>
  <div>R$ 8.000 – 12.000</div>
</Card>
```

Props: `children`.
