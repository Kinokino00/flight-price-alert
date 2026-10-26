import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCircle2, Clock, CreditCard, Plane, XCircle } from "lucide-react";

import {
  PLANS,
  cancelSubscription,
  goToCheckout,
  listSubscriptions,
  statusOf,
  subscribe,
  type PlanName,
  type Subscription,
  type SubscriptionStatus,
} from "@/lib/flight-api";

const twd = (n: number) => `NT$${n.toLocaleString("en-US")}`;

export function SubscribePanel({ email }: { email: string }) {
  const key = ["subscriptions", email];
  const [params, setParams] = useSearchParams();
  const purchase = params.get("purchase");
  // ECPay's server-to-server callback (ReturnURL) can land a few seconds after the browser
  // comes back, so poll briefly after a successful checkout until the card shows active.
  const [polling, setPolling] = useState(purchase === "success");
  useEffect(() => {
    if (!polling) return;
    const t = setTimeout(() => setPolling(false), 30_000);
    return () => clearTimeout(t);
  }, [polling]);

  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => listSubscriptions(email),
    refetchInterval: polling ? 3_000 : false,
  });
  const byRoute = new Map((data ?? []).map((s) => [s.route, s]));
  const anyPending = (data ?? []).some((s) => statusOf(s) === "pending_payment");
  useEffect(() => {
    if (polling && data && !anyPending) setPolling(false);
  }, [polling, data, anyPending]);

  function dismiss() {
    params.delete("purchase");
    setParams(params, { replace: true });
  }

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <BellRing className="h-5 w-5 text-primary" /> 追蹤航線 / Watch a route
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        設定目標價（新台幣），完成月訂閱付款後，每 30
        分鐘檢查一次下個月的最低票價，達標就寄信通知你。可隨時取消。
      </p>
      {purchase === "success" && (
        <Banner tone="ok" onClose={dismiss}>
          {polling ? "付款完成，正在確認訂閱狀態…" : "付款完成！訂閱已開通，達標時會寄信通知你。"}
        </Banner>
      )}
      {purchase === "failed" && (
        <Banner tone="error" onClose={dismiss}>
          付款沒有成功，訂閱尚未開通。可以再按一次「完成付款」重試。
        </Banner>
      )}
      {error && <p className="mt-3 text-sm text-destructive">{(error as Error).message}</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

function Banner({
  tone,
  onClose,
  children,
}: {
  tone: "ok" | "error";
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="status"
      className={`mt-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
        tone === "ok"
          ? "border-primary/40 bg-primary/10"
          : "border-destructive/40 bg-destructive/10"
      }`}
    >
      <span>{children}</span>
      <button type="button" onClick={onClose} className="text-muted-foreground" aria-label="關閉">
        ×
      </button>
    </div>
  );
}

const BADGE: Record<SubscriptionStatus, { text: string; cls: string; Icon: typeof CheckCircle2 }> =
  {
    active: { text: "已訂閱（有效）", cls: "bg-primary/10 text-primary", Icon: CheckCircle2 },
    pending_payment: {
      text: "未完成付款",
      cls: "bg-amber-500/15 text-amber-500",
      Icon: CreditCard,
    },
    cancelled: { text: "已取消", cls: "bg-muted text-muted-foreground", Icon: Clock },
    expired: { text: "已結束", cls: "bg-muted text-muted-foreground", Icon: XCircle },
  };

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
  const status = statusOf(current);
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["subscriptions", email] });

  const mutation = useMutation({
    mutationFn: (target: number) => subscribe(email, plan.plan as PlanName, target),
    onSuccess: async (result) => {
      if (result.kind === "checkout") {
        setNotice("正在前往綠界付款頁…");
        goToCheckout(result.html);
        return;
      }
      setEditing(false);
      setPrice("");
      setNotice("已儲存 ✓");
      await refresh();
    },
  });

  const cancel = useMutation({
    mutationFn: () => cancelSubscription(email, plan.route),
    onSuccess: async (r) => {
      setNotice(`已取消，${r.current_period_end_date ?? "本期結束"} 前仍會通知你。`);
      await refresh();
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setNotice("");
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) return;
    mutation.mutate(Math.round(n));
  }

  function onCancel() {
    if (
      !window.confirm(`確定取消「${plan.label}」的訂閱嗎？之後不會再扣款，本期結束前仍會收到通知。`)
    ) {
      return;
    }
    setNotice("");
    cancel.mutate();
  }

  // Subscribing (or re-subscribing after expiry) goes through checkout; paid and
  // in-grace subscriptions can update their target in place.
  const needsCheckout = !current || status === "expired" || status === "pending_payment";
  const badge = status ? BADGE[status] : undefined;
  const err = (mutation.error ?? cancel.error) as Error | null;

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <Plane className="h-4 w-4 text-primary" /> {plan.label}
        </p>
        {badge && (
          <span
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}
          >
            <badge.Icon className="h-3.5 w-3.5" /> {badge.text}
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
          {status === "active" && current.current_period_end_date && (
            <p className="text-xs text-muted-foreground">
              本期至 {current.current_period_end_date}，之後每月自動續訂
            </p>
          )}
          {status === "cancelled" && (
            <p className="text-xs text-muted-foreground">
              有效至 {current.current_period_end_date ?? "本期結束"}（仍會通知到該日）
            </p>
          )}
          {status === "pending_payment" && (
            <p className="text-xs text-muted-foreground">完成付款後才會開始寄送降價通知。</p>
          )}
          {status === "expired" && (
            <p className="text-xs text-muted-foreground">訂閱已結束，不會再寄送通知。</p>
          )}
          {notice && <p className="text-sm text-primary">{notice}</p>}
          {err && <p className="text-sm text-destructive">{err.message}</p>}

          {(status === "pending_payment" || status === "expired") && (
            <button
              type="button"
              className="btn-primary w-full"
              disabled={mutation.isPending}
              onClick={() => {
                setNotice("");
                mutation.mutate(Number(current.target_price));
              }}
            >
              {mutation.isPending ? "…" : status === "expired" ? "重新訂閱" : "完成付款 / Pay"}
            </button>
          )}
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => {
              setNotice("");
              setPrice(String(current.target_price));
              setEditing(true);
            }}
          >
            更新目標價
          </button>
          {status === "active" && (
            <button
              type="button"
              className="w-full text-xs text-muted-foreground underline-offset-4 hover:underline"
              disabled={cancel.isPending}
              onClick={onCancel}
            >
              {cancel.isPending ? "取消中…" : "取消訂閱"}
            </button>
          )}
        </div>
      ) : (
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
          {needsCheckout && (
            <p className="text-xs text-muted-foreground">送出後會前往綠界完成月訂閱付款。</p>
          )}
          {notice && <p className="text-sm text-primary">{notice}</p>}
          {mutation.error && (
            <p className="text-sm text-destructive">{(mutation.error as Error).message}</p>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex-1">
              {mutation.isPending ? "…" : needsCheckout ? "訂閱並付款" : "儲存"}
            </button>
            {editing && (
              <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
                取消
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
