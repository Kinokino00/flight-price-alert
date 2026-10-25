import { Link, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Plane } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/components/RequireAuth";
import { usePageMeta } from "@/lib/use-page-meta";
import { SubscribePanel } from "@/components/SubscribePanel";

export function AppPage() {
  usePageMeta({
    title: "Dashboard — Flight Price Notifier",
    description: "Your Flight Price Notifier route-watching dashboard.",
    ogDescription: "Your route-watching dashboard.",
  });
  const user = useAuthUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate("/signin", { replace: true });
  }

  return (
    <div className="bg-hero min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Plane className="h-5 w-5 text-primary" /> Flight Price Notifier
        </Link>
        <button onClick={signOut} className="btn-ghost">
          Sign out / 登出
        </button>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-16 animate-in fade-in duration-500">
        <h1 className="text-3xl font-bold sm:text-4xl">Hi {user.email}</h1>
        <SubscribePanel email={user.email ?? ""} />
      </main>
    </div>
  );
}
