// Client for the Flight Price Notifier API (AWS API Gateway → Lambda → DynamoDB).
// The browser holds no AWS credentials; it only calls these public routes.
export const FLIGHT_API_URL: string =
  import.meta.env["VITE_FLIGHT_API_URL"] ??
  "https://m3czapana2.execute-api.us-east-1.amazonaws.com";

export type PlanName = "tokyo" | "seoul" | "london";

// M2 lifecycle: pending_payment → active ⇄ (target updates) → cancelled (grace) → expired.
// Rows created before M2 have no status at all; treat them like pending_payment.
export type SubscriptionStatus = "pending_payment" | "active" | "cancelled" | "expired";

export type Subscription = {
  email: string;
  route: string;
  plan_name: PlanName;
  origin: string;
  destination: string;
  target_price: number;
  currency: "TWD";
  created_at: string;
  updated_at: string;
  subscription_status?: SubscriptionStatus;
  current_period_end_date?: string;
};

export const PLANS: { plan: PlanName; label: string; route: string; hint: number }[] = [
  { plan: "tokyo", label: "台北 ✈ 東京", route: "TPE-TYO", hint: 7457 },
  { plan: "seoul", label: "台北 ✈ 首爾", route: "TPE-SEL", hint: 7071 },
  { plan: "london", label: "台北 ✈ 倫敦", route: "TPE-LON", hint: 23081 },
];

export function statusOf(s: Subscription | undefined): SubscriptionStatus | undefined {
  if (!s) return undefined;
  return s.subscription_status ?? "pending_payment";
}

export async function listSubscriptions(email: string): Promise<Subscription[]> {
  const res = await fetch(`${FLIGHT_API_URL}/subscriptions?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error(`讀取訂閱失敗 (${res.status})`);
  const body = (await res.json()) as { subscriptions?: Subscription[] };
  return body.subscriptions ?? [];
}

// POST /subscribe answers in one of two shapes (m2-ecpay-subscription Step 2):
//  - text/html: an auto-submitting ECPay checkout form → the user must pay first
//  - application/json: an in-place target update for a paid (or cancelled-in-grace) subscription
export type SubscribeResult = { kind: "checkout"; html: string } | { kind: "updated" };

export async function subscribe(
  email: string,
  plan_name: PlanName,
  target_price: number,
): Promise<SubscribeResult> {
  const res = await fetch(`${FLIGHT_API_URL}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, plan_name, target_price }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `訂閱失敗 (${res.status})`);
  }
  if ((res.headers.get("content-type") ?? "").includes("text/html")) {
    return { kind: "checkout", html: await res.text() };
  }
  return { kind: "updated" };
}

// Replace the page with ECPay's form; its inline script auto-POSTs to the ECPay cashier.
export function goToCheckout(html: string): void {
  document.open();
  document.write(html);
  document.close();
}

export async function cancelSubscription(
  email: string,
  route: string,
): Promise<{ current_period_end_date?: string }> {
  const res = await fetch(`${FLIGHT_API_URL}/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, route }),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    current_period_end_date?: string;
  };
  if (!res.ok) throw new Error(body.error ? `取消失敗：${body.error}` : `取消失敗 (${res.status})`);
  return body;
}
