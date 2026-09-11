import { useCallback, useEffect, useState } from "react";

export type Route = "home" | "detect" | "reports" | "protection" | "shield" | "lab";

const PATHS: Record<Route, string> = {
  home: "/",
  detect: "/detect",
  reports: "/reports",
  protection: "/protection",
  shield: "/shield",
  lab: "/lab",
};

function routeFor(pathname: string): Route {
  if (pathname.startsWith("/detect")) return "detect";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/protection")) return "protection";
  if (pathname.startsWith("/shield")) return "shield";
  if (pathname.startsWith("/lab")) return "lab";
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
