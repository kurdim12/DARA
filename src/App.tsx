import { useCallback, useState } from "react";
import type { AnalysisType, AnalyzeImage, Category } from "../shared/types";
import { LangProvider } from "./i18n";
import { ThemeProvider } from "./lib/theme";
import { useRouter, type Route } from "./lib/router";
import { Home, type Draft } from "./routes/Home";
import { Scan, type Seed } from "./routes/Scan";
import { Threats } from "./routes/Threats";
import { Report } from "./routes/Report";
import { Protect } from "./routes/Protect";
import { Learn } from "./routes/Learn";
import { Recover } from "./routes/Recover";
import { Shield } from "./routes/Shield";
import { Help } from "./routes/Help";
import { Radar } from "./routes/Radar";
import { Lab } from "./routes/Lab";

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <Screens />
      </LangProvider>
    </ThemeProvider>
  );
}

function Screens() {
  const { route, navigate, quickExit } = useRouter();
  /** Text or a screenshot handed to Scan, the chip to land on, and whether to run it. */
  const [seed, setSeed] = useState<Seed | null>(null);
  const clearSeed = useCallback(() => setSeed(null), []);
  /** What a verdict knew about the threat, so Report opens with it filled in. */
  const [prefill, setPrefill] = useState<{ category: Category; messageText: string } | null>(null);
  /** Set by "Check before you pay", which is the lookup rather than the list. */
  const [focusLookup, setFocusLookup] = useState(false);
  /**
   * What is half-typed into Home's input card. It lives here rather than in
   * Home so that tapping the raised فحص button carries it across instead of
   * throwing it away — the two screens share one input, so they share its
   * contents too.
   */
  const [draft, setDraft] = useState<Draft>({ text: "", type: "message", image: null });

  /**
   * Home's navigate. Leaving Home for فحص with something in the field seeds
   * فحص with it, unrun: carried over for review, never scanned behind the
   * person's back.
   */
  const navigateFromHome = useCallback(
    (next: Route) => {
      if (next === "scan" && (draft.text.trim().length > 0 || draft.image)) {
        setSeed({ text: draft.text, run: false, type: draft.type, image: draft.image });
      }
      navigate(next);
    },
    [draft, navigate],
  );

  const handOff = useCallback(
    (text: string, run: boolean, type?: AnalysisType, image?: AnalyzeImage | null) => {
      setSeed({ text, run, type, image });
      navigate("scan");
    },
    [navigate],
  );

  const openLookup = useCallback(() => {
    setFocusLookup(true);
    navigate("protect");
  }, [navigate]);

  const openReport = useCallback(
    (next: { category: Category; messageText: string }) => {
      setPrefill(next);
      navigate("report");
    },
    [navigate],
  );

  switch (route) {
    case "scan":
      return (
        <Scan
          navigate={navigate}
          seed={seed}
          onSeedUsed={clearSeed}
          onReport={openReport}
        />
      );
    case "threats":
      return <Threats navigate={navigate} />;
    case "radar":
      return (
        <Radar navigate={navigate} onCheckSample={(text) => handOff(text, false)} />
      );
    case "help":
      return <Help navigate={navigate} />;
    case "report":
      return <Report navigate={navigate} prefill={prefill} />;
    case "protect":
      return (
        <Protect
          navigate={navigate}
          onCheck={(text, type) => handOff(text, true, type)}
          focusLookup={focusLookup}
          onLookupFocused={() => setFocusLookup(false)}
        />
      );
    case "learn":
      return <Learn navigate={navigate} />;

    case "recover":
      return <Recover navigate={navigate} />;
    case "shield":
      return <Shield navigate={navigate} quickExit={quickExit} />;
    case "lab":
      return import.meta.env.DEV ? <Lab /> : null;

    default:
      return (
        <Home
          navigate={navigateFromHome}
          onLookup={openLookup}
          draft={draft}
          onDraft={setDraft}
          onStaged={(text) => handOff(text, false)}
          onSubmit={(text, type, image) => handOff(text, true, type, image)}
        />
      );
  }
}
