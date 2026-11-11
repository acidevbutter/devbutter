---
category: Actions
---
Button is DevButter's admin action control: a solid green primary, an outline secondary and a danger variant, in three sizes.

Use `solid` for the one primary action of a page or panel, `outline` for secondary actions, `danger` for destructive ones. Size `md` is a page action, `sm` a list-header action, `row` an in-table action. While an action runs, disable the button and end its label with an ellipsis ("Aprovando…").

```tsx
<Button>Aprovar e criar pedido</Button>
<Button variant="outline" size="sm">Salvar alterações</Button>
<Button variant="danger" size="row">Rejeitar</Button>
<Button href="/admin/quotes/new" size="sm">+ Novo orçamento manual</Button>
```

Props: `variant` (`"solid" | "outline" | "danger"`, default `solid`), `size` (`"md" | "sm" | "row"`, default `md`), `href`, `className` and every native `<button>` attribute. With `href` it renders an anchor (a `next/link` in the app) and only `children` and `className` are forwarded, so do not combine `href` with `onClick` or `disabled`.

Copy follows [Voice](Voice.md): Brazilian Portuguese, sentence case, infinitive verb + object ("Confirmar dados", not "Clique aqui"), no exclamation marks, and code nouns translated (`order` → pedido, `quote` → orçamento). `solid` is signal green and means *the* action; `danger` is problem pink and its label must name what is lost ("Recusar orçamento"). Hover and focus transitions use `$mo-quick`; keyboard focus is the global 2px green ring.
