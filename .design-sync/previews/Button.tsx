import { Button } from '@devbutter/ui';

const row: React.CSSProperties = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: 20, background: 'var(--db-bg)', color: 'var(--db-text-primary)', borderRadius: 12 };

export const Variants = () => (
  <div style={row}>
    <Button>Aprovar e criar order</Button>
    <Button variant="outline">Salvar alterações</Button>
    <Button variant="danger">Rejeitar</Button>
  </div>
);

export const Sizes = () => (
  <div style={row}>
    <Button size="md">+ Novo quote</Button>
    <Button size="sm">+ Novo quote manual</Button>
    <Button size="row">Revisar</Button>
  </div>
);

export const Disabled = () => (
  <div style={row}>
    <Button disabled>Aprovando…</Button>
    <Button variant="outline" disabled>Salvando…</Button>
    <Button variant="danger" disabled>Rejeitando…</Button>
  </div>
);

export const AsLink = () => (
  <div style={row}>
    <Button href="/admin/quotes/new" size="sm">+ Novo quote manual</Button>
    <Button href="/admin/clients" variant="outline" size="sm">Ver clientes</Button>
  </div>
);
