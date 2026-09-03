"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function DueMonthFilter({
  months,
}: {
  months: { ym: string; label: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("due") ?? "";

  return (
    <label style={{ marginLeft: "auto", position: "relative", display: "inline-flex" }}>
      <select
        value={current}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value) next.set("due", e.target.value);
          else next.delete("due");
          router.push(`/admin/invoices?${next.toString()}`);
        }}
        style={{
          appearance: "none",
          font: "11.5px 'Geist Mono', monospace",
          color: "var(--db-text-muted)",
          background: "transparent",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 8,
          padding: "6px 22px 6px 11px",
          cursor: "pointer",
        }}
      >
        <option value="">venc. — tudo</option>
        {months.map((m) => (
          <option key={m.ym} value={m.ym}>
            venc. {m.label}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 9,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "var(--db-text-muted)",
          fontSize: 10,
        }}
      >
        ▾
      </span>
    </label>
  );
}
