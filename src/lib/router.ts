import { useCallback, useEffect, useState } from "react";

export type Route =
  | "home"
  | "detect"
  | "reports"
  | "protection"
  | "educate"
  | "recover"
  | "shield"
  | "lab";

const PATHS: Record<Route, string> = {
  home: "/",
  detect: "/detect",
  reports: "/reports",
  protection: "/protection",
  educate: "/educate",
  recover: "/recover",
  shield: "/shield",
  lab: "/lab",
};

function routeFor(pathname: string): Route {
  if (pathname.startsWith("/detect")) return "detect";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/protection")) return "protection";
  if (pathname.startsWith("/educate")) return "educate";
  if (pathname.startsWith("/recover")) return "recover";
  if (pathname.startsWith("/shield")) return "shield";
  // The engine console is a development tool: it renders the raw API response
  // next to the verdict. Nothing links to it, but the URL worked in production
  // until now, and the demo is on a phone someone else may be holding.
  if (pathname.startsWith("/lab") && import.meta.env.DEV) return "lab";
  return "home";
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() => routeFor(location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(routeFor(location.pathname));
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((next: Route) => {
    history.pushState({}, "", PATHS[next]);
    setRoute(next);
    scrollTo(0, 0);
  }, []);

  /**
   * Leaves Shield without leaving a trace in this tab's history: a full
   * replace, so Back cannot return to it.
   */
  const quickExit = useCallback(() => {
    location.replace(PATHS.home);
  }, []);

  return { route, navigate, quickExit };
}
