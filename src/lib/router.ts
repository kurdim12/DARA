import { useCallback, useEffect, useState } from "react";

export type Route =
  | "home"
  | "scan"
  | "report"
  | "recover"
  | "shield"
  | "threats"
  | "protect"
  | "learn"
  | "lab";

const PATHS: Record<Route, string> = {
  home: "/",
  scan: "/scan",
  report: "/report",
  threats: "/threats",
  protect: "/protect",
  learn: "/learn",
  recover: "/recover",
  shield: "/shield",
  lab: "/lab",
};

/**
 * Longest prefix wins, so "/reports" is never read as "/report" and
 * "/protection" is never read as "/protect".
 */
function routeFor(pathname: string): Route {
  const candidates = (Object.entries(PATHS) as [Route, string][])
    .filter(([, path]) => path !== "/")
    .sort((a, b) => b[1].length - a[1].length);

  for (const [route, path] of candidates) {
    if (!pathname.startsWith(path)) continue;
    // The engine console is a development tool: it renders the raw API
    // response next to the verdict, and the URL answered in production until
    // the audit caught it.
    if (route === "lab" && !import.meta.env.DEV) return "home";
    return route;
  }
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
