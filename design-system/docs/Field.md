---
category: Forms
---
Field is the form primitive: a label, one control (`Input`, `Textarea` or `Select`), an optional hint and an optional error, wired for screen readers. The control gets the `id`, `aria-describedby` for the hint and error, and `aria-invalid` when there's an error. It's built on the site's existing `field` and `input` mixins, so site, portal and admin forms share one control.

Use it for every new form field instead of a bare `<input>`. Mark the few optional fields with `optional` rather than starring the required ones. Write the error as an instruction ("Preencha um e-mail válido."); it renders in `$problem` with `role="alert"`, so the words carry the message, not the colour.

```tsx
import Field, { Input, Textarea, Select } from "@/components/admin/ui/Field/Field";

<Field label="E-mail" error={errors.email}>
  <Input type="email" name="email" autoComplete="email" />
</Field>
<Field label="WhatsApp" optional hint="só pra falar sobre o diagnóstico">
  <Input type="tel" name="whatsapp" />
</Field>
<Field label="O que está travando?">
  <Textarea name="recado" />
</Field>
<Field label="Setor">
  <Select name="setor"><option>varejo</option><option>saúde</option></Select>
</Field>
```

Props: `label`, `hint`, `error`, `optional` (default `false`), `className`, and exactly one control as `children`. A control's own `id` and `aria-describedby` are kept and merged. `Input`, `Textarea` and `Select` take every native attribute. Controls are at least 44px tall (`$touch-min`), and focus is shown with a green border and halo instead of the global ring.

It's a client component (`useId`). In a server component, pass it from a client form.
