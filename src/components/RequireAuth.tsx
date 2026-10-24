import { useEffect, useState } from "react";
import { Navigate, Outlet, useOutletContext } from "react-router";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

type AuthState = { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; user: User };

/** Guards child routes: redirects to /signin unless a Supabase user is signed in. */
export function RequireAuth() {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setState(data.user ? { status: "signed-in", user: data.user } : { status: "signed-out" });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState(session?.user ? { status: "signed-in", user: session.user } : { status: "signed-out" });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (state.status === "loading") return <div className="bg-hero min-h-screen" />;
  if (state.status === "signed-out") return <Navigate to="/signin" replace />;
  return <Outlet context={{ user: state.user } satisfies AuthContext} />;
}

export type AuthContext = { user: User };

export function useAuthUser() {
  return useOutletContext<AuthContext>().user;
}
