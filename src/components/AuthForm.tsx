import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Plane } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSignUp = mode === "signup";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = isSignUp
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/app" } })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    if (data.session) navigate({ to: "/app", replace: true });
    else setError("請到信箱確認後再登入 / Please confirm your email, then sign in.");
  }

  return (
    <div className="bg-hero flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <Plane className="h-5 w-5 text-primary" /> Flight Price Notifier
        </Link>
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border bg-card p-6">
          <h1 className="text-xl font-semibold">{isSignUp ? "建立帳號 / Sign up" : "登入 / Sign in"}</h1>
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Email</span>
            <input className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Password</span>
            <input className="field" type="password" required minLength={6} autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "…" : isSignUp ? "Sign up / 註冊" : "Sign in / 登入"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? (
              <>已有帳號？ <Link to="/signin" className="text-primary hover:underline">Sign in</Link></>
            ) : (
              <>還沒有帳號？ <Link to="/signup" className="text-primary hover:underline">Sign up</Link></>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}
