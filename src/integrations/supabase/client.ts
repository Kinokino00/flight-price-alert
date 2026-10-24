import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// The single Supabase client for the app. Values are inlined by Vite at build
// time from .env (locally) or the Vercel project's environment variables.
const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"];
const SUPABASE_PUBLISHABLE_KEY = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  const missing = [
    ...(!SUPABASE_URL ? ["VITE_SUPABASE_URL"] : []),
    ...(!SUPABASE_PUBLISHABLE_KEY ? ["VITE_SUPABASE_PUBLISHABLE_KEY"] : []),
  ];
  throw new Error(
    `Missing Supabase environment variable(s): ${missing.join(", ")}. Set them in .env or your Vercel project settings.`,
  );
}

// Publishable keys (sb_publishable_*) are opaque strings, not JWTs: send them only
// as the `apikey` header, never as a Bearer token.
function publishableKeyFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    if (key.startsWith("sb_publishable_") && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

// Import the client like this:
// import { supabase } from "@/integrations/supabase/client";
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: { fetch: publishableKeyFetch(SUPABASE_PUBLISHABLE_KEY) },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
