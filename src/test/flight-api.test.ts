import { afterEach, describe, expect, it, vi } from "vitest";

import { cancelSubscription, statusOf, subscribe, type Subscription } from "@/lib/flight-api";

function mockFetch(body: string, contentType: string, status = 200) {
  const fn = vi.fn(
    async () => new Response(body, { status, headers: { "content-type": contentType } }),
  );
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("subscribe (M2 Content-Type contract)", () => {
  it("returns the ECPay checkout form when the API answers text/html", async () => {
    const html = '<form action="https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"></form>';
    mockFetch(html, "text/html; charset=utf-8");
    await expect(subscribe("a@example.com", "tokyo", 9000)).resolves.toEqual({
      kind: "checkout",
      html,
    });
  });

  it("treats a JSON answer as an in-place target update", async () => {
    mockFetch(JSON.stringify({ ok: true, updated: true }), "application/json");
    await expect(subscribe("a@example.com", "tokyo", 9000)).resolves.toEqual({ kind: "updated" });
  });

  it("surfaces the API error message", async () => {
    mockFetch(JSON.stringify({ error: "invalid input" }), "application/json", 400);
    await expect(subscribe("a@example.com", "tokyo", 9000)).rejects.toThrow("invalid input");
  });
});

describe("cancelSubscription", () => {
  it("posts email + route to /cancel and returns the paid-through date", async () => {
    const fn = mockFetch(
      JSON.stringify({ ok: true, current_period_end_date: "2026-12-26" }),
      "application/json",
    );
    await expect(cancelSubscription("a@example.com", "TPE-TYO")).resolves.toMatchObject({
      current_period_end_date: "2026-12-26",
    });
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/cancel$/);
    expect(JSON.parse(init.body as string)).toEqual({ email: "a@example.com", route: "TPE-TYO" });
  });
});

describe("statusOf", () => {
  it("treats pre-M2 rows without a status as unpaid", () => {
    expect(statusOf({ route: "TPE-TYO" } as Subscription)).toBe("pending_payment");
    expect(statusOf(undefined)).toBeUndefined();
  });
});
