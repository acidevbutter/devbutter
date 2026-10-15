// The client never sees a price before its quote is approved
// (docs/plano-preco-so-apos-aprovacao.md). devbutter_backend still sends the
// AI's `price_range` / `budget_range` on the conversation endpoints
// (devbutter_backend#23), so every conversation BFF passes its JSON through
// this before it reaches the browser (#66). Admin routes don't use it.

const PRICE_KEYS = new Set(["price_range", "budget_range"]);

export function redactPrices<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => redactPrices(v)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([k]) => !PRICE_KEYS.has(k))
        .map(([k, v]) => [k, redactPrices(v)])
    ) as T;
  }
  return value;
}
