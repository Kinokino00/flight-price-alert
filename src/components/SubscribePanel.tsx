import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCircle2, Plane } from "lucide-react";

import {
  PLANS,
  listSubscriptions,
  subscribe,
  type PlanName,
  type Subscription,
} from "@/lib/flight-api";

const twd = (n: number) => `NT$${n.toLocaleString("en-US")}`;

export function SubscribePanel({ email }: { email: string }) {
  const key = ["subscriptions", email];
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => listSubscriptions(email),
  });
  const byRoute = new Map((data ?? []).map((s) => [s.route, s]));

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <BellRing className="h-5 w-5 text-primary" /> 追蹤航線 / Watch a route
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        設定目標價（新台幣），每 30 分鐘檢查一次下個月的最低票價，達標就寄信通知你。
      </p>
      {error && <p className="mt-3 text-sm text-destructive">{(error as Error).message}</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {PLANS.map((p) => (
          <PlanCard
            key={p.plan}
            email={email}
            plan={p}
            current={byRoute.get(p.route)}
            loading={isLoading}
          />
        ))}
      </div>
    </section>
  );
}

function PlanCard({
  email,
  plan,
  current,
  loading,
}: {
  email: string;
  plan: (typeof PLANS)[number];
  current: Subscription | undefined;
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState("");
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (target: number) => subscribe(email, plan.plan as PlanName, target),
    onSuccess: async () => {
      setEditing(false);
      setPrice("");
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["subscriptions", email] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) return;
    mutation.mutate(Math.round(n));
  }

  const showForm = !current || editing;

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <Plane className="h-4 w-4 text-primary" /> {plan.label}
        </p>
        {current && (
          <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" /> 已訂閱
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">近期最低價約 {twd(plan.hint)}（參考）</p>

      {loading ? (
        <div className="mt-5 h-10 animate-pulse rounded-lg bg-muted" />
      ) : current && !editing ? (
        <div className="mt-5 space-y-3">
          <p className="text-sm">
            目標價 <span className="font-semibold">{twd(current.target_price)}</span>
          </p>
          {saved && <p className="text-sm text-primary">已儲存 ✓</p>}
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => {
              setSaved(false);
              setPrice(String(current.target_price));
              setEditing(true);
            }}
          >
            更新目標價
          </button>
        </div>
      ) : showForm ? (
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">目標價（新台幣）</span>
            <input
              className="field"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              required
              placeholder={String(plan.hint)}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          {mutation.error && (
            <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "…" : current ? "儲存" : "開始追蹤"}
            </button>
            {editing && (
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
                取消
              </button>
            )}
          </div>
        </form>
      ) : null}
    </div>
  );
}
