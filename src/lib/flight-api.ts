// Client for the Flight Price Notifier API (AWS API Gateway → Lambda → DynamoDB).
// The browser holds no AWS credentials; it only calls these two public routes.
export const FLIGHT_API_URL: string =
  import.meta.env["VITE_FLIGHT_API_URL"] ??
  "https://m3czapana2.execute-api.us-east-1.amazonaws.com";

export type PlanName = "tokyo" | "seoul";

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
};

export const PLANS: { plan: PlanName; label: string; route: string; hint: number }[] = [
  { plan: "tokyo", label: "台北 ✈ 東京", route: "TPE-TYO", hint: 9325 },
  { plan: "seoul", label: "台北 ✈ 首爾", route: "TPE-SEL", hint: 5989 },
];

export async function listSubscriptions(email: string): Promise<Subscription[]> {
  const res = await fetch(`${FLIGHT_API_URL}/subscriptions?email=${encodeURIComponent(email)}`);
  if (!res.ok) throw new Error(`讀取訂閱失敗 (${res.status})`);
  const body = (await res.json()) as { subscriptions?: Subscription[] };
  return body.subscriptions ?? [];
}

export async function subscribe(
  email: string,
  plan_name: PlanName,
  target_price: number,
): Promise<void> {
  const res = await fetch(`${FLIGHT_API_URL}/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, plan_name, target_price }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `訂閱失敗 (${res.status})`);
  }
}
