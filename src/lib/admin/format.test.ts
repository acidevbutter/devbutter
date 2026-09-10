import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelative,
  invoiceStatusLabel,
  invoiceStatusTone,
  orderStatusTone,
  quoteStatusTone,
} from "./format";

describe("formatCurrency", () => {
  it("formats a positive amount as BRL with no decimals", () => {
    expect(formatCurrency(1500)).toBe("R$ 1.500");
  });

  it("accepts a numeric string", () => {
    expect(formatCurrency("2500")).toBe("R$ 2.500");
  });

  it("formats zero and negative values", () => {
    expect(formatCurrency(0)).toBe("R$ 0");
    expect(formatCurrency(-42)).toBe("-R$ 42");
  });

  it("returns an em dash for a non-numeric string", () => {
    expect(formatCurrency("not-a-number")).toBe("—");
  });
});

describe("formatDate", () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("formats a date-only string as day/month", () => {
    process.env.TZ = "UTC";
    expect(formatDate("2026-09-08")).toBe("08/09");
  });

  it("keeps a date-only string on the correct day in a negative-offset timezone", () => {
    // Regression guard: a date-only value parses as UTC midnight, so without
    // pinning the format call to UTC a negative offset (e.g. America/Sao_Paulo,
    // UTC-3) would roll it back to the previous day.
    process.env.TZ = "America/Sao_Paulo";
    expect(formatDate("2026-09-08")).toBe("08/09");
  });

  it("formats a full ISO timestamp in the local timezone", () => {
    process.env.TZ = "UTC";
    expect(formatDate("2026-09-08T13:00:00.000Z")).toBe("08/09");
  });

  it("returns an em dash for an invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("formatDateTime", () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("formats date and time separated by a space", () => {
    process.env.TZ = "UTC";
    expect(formatDateTime("2026-09-08T13:05:00.000Z")).toBe("08/09 13:05");
  });

  it("returns an em dash for an invalid date string", () => {
    expect(formatDateTime("not-a-date")).toBe("—");
  });
});

describe("status tone/label lookups", () => {
  it("maps known quote statuses and falls back to neutral", () => {
    expect(quoteStatusTone("draft")).toBe("amber");
    expect(quoteStatusTone("approved")).toBe("green");
    expect(quoteStatusTone("rejected")).toBe("pink");
    expect(quoteStatusTone("unknown_status")).toBe("neutral");
  });

  it("maps known order statuses and falls back to neutral", () => {
    expect(orderStatusTone("created")).toBe("amber");
    expect(orderStatusTone("completed")).toBe("green");
    expect(orderStatusTone("cancelled")).toBe("pink");
    expect(orderStatusTone("unknown_status")).toBe("neutral");
  });

  it("maps known invoice statuses to tone and label, falling back for unknown ones", () => {
    expect(invoiceStatusTone("PENDING")).toBe("amber");
    expect(invoiceStatusTone("OVERDUE")).toBe("pinkFilled");
    expect(invoiceStatusTone("UNKNOWN")).toBe("neutral");

    expect(invoiceStatusLabel("PENDING")).toBe("pendente");
    expect(invoiceStatusLabel("RECEIVED")).toBe("paga");
    expect(invoiceStatusLabel("UNKNOWN")).toBe("unknown");
  });
});

describe("formatRelative", () => {
  const now = new Date("2026-01-01T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function isoMinutesAgo(minutes: number): string {
    return new Date(now.getTime() - minutes * 60_000).toISOString();
  }

  it("returns 'agora' for less than a minute ago", () => {
    expect(formatRelative(isoMinutesAgo(0))).toBe("agora");
  });

  it("returns minutes for under an hour", () => {
    expect(formatRelative(isoMinutesAgo(30))).toBe("há 30min");
  });

  it("returns hours for under a day", () => {
    expect(formatRelative(isoMinutesAgo(90))).toBe("há 2h");
  });

  it("returns 'ontem' for exactly one day ago", () => {
    expect(formatRelative(isoMinutesAgo(24 * 60))).toBe("ontem");
  });

  it("returns days for more than a day ago", () => {
    expect(formatRelative(isoMinutesAgo(2 * 24 * 60))).toBe("há 2d");
  });

  it("returns an em dash for an invalid date string", () => {
    expect(formatRelative("not-a-date")).toBe("—");
  });
});
