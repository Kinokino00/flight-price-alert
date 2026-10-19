import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plane, Radar, MailCheck, CalendarX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flight Price Notifier — 機票降價通知" },
      { name: "description", content: "設定航線與目標價，機票降價就通知你。Set a route and a target price — we email you when the fare drops." },
      { property: "og:title", content: "Flight Price Notifier — 機票降價通知" },
      { property: "og:description", content: "Set a route and a target price — we email you when the fare drops." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { el.classList.add("is-visible"); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className="reveal h-full" style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

const features = [
  { icon: Radar, title: "盯緊熱門航線 (Always-on route watching)", body: "持續監控台北出發的熱門航線（東京、首爾），自動抓最低票價。" },
  { icon: MailCheck, title: "達標自動通知 (Target-price email alerts)", body: "低於你設定的目標價，就寄 email 提醒你，附上立即訂購連結。" },
  { icon: CalendarX, title: "隨時取消 (Cancel anytime)", body: "月訂閱制，不想用隨時停，沒有綁約。" },
];

function Index() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Plane className="h-5 w-5 text-primary" /> Flight Price Notifier
          </Link>
          {signedIn ? (
            <Link to="/app" className="btn-primary">Dashboard</Link>
          ) : (
            <Link to="/signin" className="btn-primary">Sign in / 登入</Link>
          )}
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-hero">
          <div className="mx-auto max-w-4xl px-4 pb-24 pt-24 text-center sm:pt-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-block rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              台北出發 · TPE → NRT / HND / ICN
            </span>
            <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-7xl">
              <span className="text-gradient">Flight Price Notifier</span>
            </h1>
            <p className="mt-6 text-xl font-medium sm:text-2xl">設定航線與目標價，機票降價就通知你</p>
            <p className="mt-3 text-muted-foreground">Set a route and a target price — we email you when the fare drops.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to="/signup" className="btn-primary">免費開始 / Get started</Link>
              <a href="#features" className="btn-ghost">了解更多 / Learn more</a>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-24">
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 120}>
                <div className="h-full rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 Flight Price Notifier
      </footer>
    </div>
  );
}
