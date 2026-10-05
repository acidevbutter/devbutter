import { Badge } from '@devbutter/ui';

const row: React.CSSProperties = { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: 20, background: 'var(--db-bg)', color: 'var(--db-text-primary)', borderRadius: 12 };

export const Tones = () => (
  <div style={row}>
    <Badge tone="green">paga</Badge>
    <Badge tone="amber">pendente</Badge>
    <Badge tone="pink">rejected</Badge>
    <Badge tone="pinkFilled">vencida</Badge>
    <Badge tone="neutral">reemb.</Badge>
  </div>
);

export const Sizes = () => (
  <div style={row}>
    <Badge tone="green" size="sm">approved</Badge>
    <Badge tone="green" size="md">approved</Badge>
    <Badge tone="amber" size="sm">draft</Badge>
    <Badge tone="amber" size="md">draft</Badge>
  </div>
);

const invoices = [
  { client: 'Ateliê Corvo', value: 'R$ 4.800', due: '12/10', tone: 'amber' as const, label: 'pendente' },
  { client: 'Lume Estúdio', value: 'R$ 2.400', due: '28/09', tone: 'pinkFilled' as const, label: 'vencida' },
  { client: 'Oficina Brisa', value: 'R$ 9.000', due: '03/09', tone: 'green' as const, label: 'paga' },
];

export const InTableRows = () => (
  <div style={{ padding: 20, background: 'var(--db-bg)', color: 'var(--db-text-primary)', borderRadius: 12 }}>
  <div style={{ width: 460, background: 'var(--admin-panel)', border: '1px solid var(--admin-border)', borderRadius: 16, overflow: 'hidden' }}>
    {invoices.map((i) => (
      <div key={i.client} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr .6fr .8fr', gap: 12, alignItems: 'center', padding: '13px 16px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span style={{ fontWeight: 600 }}>{i.client}</span>
        <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--admin-text-2)' }}>{i.value}</span>
        <span style={{ fontFamily: 'var(--font-geist-mono)', color: 'var(--admin-text-2)', fontSize: 12 }}>{i.due}</span>
        <Badge tone={i.tone} style={{ justifySelf: 'start' }}>{i.label}</Badge>
      </div>
    ))}
  </div>
  </div>
);
