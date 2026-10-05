import { Card, Label } from '@devbutter/ui';

export const LinkedClient = () => (
  <div style={{ width: 300, padding: 20, background: 'var(--db-bg)', color: 'var(--db-text-primary)', borderRadius: 12 }}>
    <Card>
      <Label>cliente vinculado</Label>
      <div style={{ fontSize: 14, fontWeight: 600 }}>Ateliê Corvo</div>
      <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11.5, color: 'var(--admin-text-2)', marginTop: 6, lineHeight: 1.5 }}>
        ana@atelie-corvo.com<br />CNPJ 12.345.678/0001-90
      </div>
    </Card>
  </div>
);

export const StatTiles = () => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 190px)', gap: 12, padding: 20, background: 'var(--db-bg)', color: 'var(--db-text-primary)', borderRadius: 12 }}>
    {[
      ['orders', '4', 'ativas agora'],
      ['a receber', 'R$ 24.600', 'invoices em aberto'],
      ['vencida', '1', 'R$ 6.000 · Ateliê Corvo'],
    ].map(([l, v, h]) => (
      <Card key={l}>
        <Label>{l}</Label>
        <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>{v}</div>
        <div style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11.5, color: 'var(--admin-text-2)', marginTop: 4 }}>{h}</div>
      </Card>
    ))}
  </div>
);
