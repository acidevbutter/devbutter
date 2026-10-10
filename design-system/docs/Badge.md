---
category: Display
---
Badge is the admin status pill: a 10px mono word in a 1px outline whose tone says how the state should be read.

Put one Badge next to the thing it describes (a table row's status cell, a detail header). Always write the state in words (`paga`, `vencida`, `draft`); tone reinforces the word and never replaces it, because green and pink differ by only 2.2:1. Use `size="sm"` in list rows and `size="md"` in detail headers. Use `pinkFilled` only for the one state that must stand out in a list, such as an overdue invoice.

```tsx
<Badge tone="green">paga</Badge>
<Badge tone="amber">pendente</Badge>
<Badge tone="pinkFilled">vencida</Badge>
<Badge tone="neutral" size="md">reemb.</Badge>
```

Props: `tone` (`"green" | "pink" | "pinkFilled" | "amber" | "neutral"`, default `neutral`), `size` (`"sm" | "md"`, default `sm`) and every `<span>` attribute. Inside a grid cell pass `style={{ justifySelf: "start" }}` or the pill stretches across the column.

Tones in the app: quotes `draft` amber, `approved` green, `edited` neutral, `rejected` pink; orders `created` and `invoiced` amber, `completed` green, `cancelled` pink; invoices `PENDING` amber, `OVERDUE` pinkFilled, `RECEIVED` green, `REFUNDED` neutral.
