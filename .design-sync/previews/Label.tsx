import { Card, Label } from '@devbutter/ui';

export const Captions = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 280, padding: 20, background: 'var(--db-bg)', color: 'var(--db-text-primary)', borderRadius: 12 }}>
    <Card>
      <Label>faixa de preço</Label>
      <div style={{ fontSize: 14 }}>R$ 8.000 – 12.000</div>
    </Card>
    <Card>
      <Label>prazo estimado</Label>
      <div style={{ fontSize: 14 }}>6 semanas</div>
    </Card>
  </div>
);
