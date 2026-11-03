import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  dateRangeForPeriod,
  prevDateRangeForPeriod,
  zonedBoundary,
  zonedParts,
} from "./service.js";

// 2026-11-01T18:30:00Z is 2026-11-02 00:15 in Asia/Kathmandu (UTC+05:45).
const NOW = new Date("2026-11-01T18:30:00.000Z");

describe("analytics period boundaries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes the zoned calendar parts, not the server's UTC date", () => {
    expect(zonedParts(NOW)).toEqual({ y: 2026, m: 10, d: 2 });
  });

  it("uses Asia/Kathmandu for 'today'", () => {
    const range = dateRangeForPeriod("today");
    expect(range.from?.toISOString()).toBe("2026-11-01T18:15:00.000Z");
    expect(range.to?.toISOString()).toBe("2026-11-02T18:14:59.999Z");

    // 19:00Z is already 00:45 on Nov 2 locally.
    expect(range.from!.getTime()).toBeLessThan(
      new Date("2026-11-01T19:00:00.000Z").getTime()
    );
    // 18:00Z is still 23:45 on Nov 1 locally.
    expect(range.from!.getTime()).toBeGreaterThan(
      new Date("2026-11-01T18:00:00.000Z").getTime()
    );
  });

  it("starts 'month' at local midnight on the 1st", () => {
    const range = dateRangeForPeriod("month");
    expect(range.from?.toISOString()).toBe("2026-10-31T18:15:00.000Z");
  });

  it("shifts the previous month correctly", () => {
    const range = prevDateRangeForPeriod("month");
    expect(range.from?.toISOString()).toBe("2026-09-30T18:15:00.000Z");
    expect(range.to?.toISOString()).toBe("2026-10-31T18:14:59.999Z");
  });

  it("treats a custom date as a full zoned day", () => {
    const range = dateRangeForPeriod("custom", {
      dateFrom: "2026-11-02",
      dateTo: "2026-11-02",
    });
    expect(range.from?.toISOString()).toBe("2026-11-01T18:15:00.000Z");
    expect(range.to?.toISOString()).toBe("2026-11-02T18:14:59.999Z");
  });

  it("keeps zonedBoundary offset from UTC midnight", () => {
    expect(zonedBoundary(2026, 10, 2).toISOString()).toBe("2026-11-01T18:15:00.000Z");
    expect(zonedBoundary(2026, 10, 2, true).toISOString()).toBe(
      "2026-11-02T18:14:59.999Z"
    );
  });
});
