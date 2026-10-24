import { matchRoutes } from "react-router";
import { describe, expect, it } from "vitest";

import { routes } from "@/App";

// Match routes without rendering, so the test needs no Supabase network access.
describe("App routing", () => {
  it.each(["/", "/signin", "/signup", "/app"])("matches a real page for %s", (path) => {
    const leaf = matchRoutes(routes, path)?.at(-1);
    expect(leaf?.route.path).toBe(path);
  });

  it("falls back to the not-found page for unknown paths", () => {
    expect(matchRoutes(routes, "/nope")?.at(-1)?.route.path).toBe("*");
  });
});
