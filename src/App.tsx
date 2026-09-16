import { useCallback, useState } from "react";
import type { AnalysisType, AnalyzeImage, Category } from "../shared/types";
import { LangProvider } from "./i18n";
import { ThemeProvider } from "./lib/theme";
import { useRouter } from "./lib/router";
import { Home } from "./routes/Home";
import { Scan, type Seed } from "./routes/Scan";
import { Threats } from "./routes/Threats";
import { Report } from "./routes/Report";
import { Protect } from "./routes/Protect";
import { Learn } from "./routes/Learn";
import { Recover } from "./routes/Recover";
import { Shield } from "./routes/Shield";
import { Help } from "./routes/Help";
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

  const handOff = useCallback(
    (text: string, run: boolean, type?: AnalysisType, image?: AnalyzeImage | null) => {
      setSeed({ text, run, type, image });
      navigate("scan");
    },
    [navigate],
  );

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
    // Radar lands on Known Threats until Phase 2 folds the documented
    // campaigns into it. Every tab reaches a real screen; none is a stub.
    case "radar":
      return <Threats navigate={navigate} />;
    case "help":
      return <Help navigate={navigate} />;
    case "report":
      return <Report navigate={navigate} prefill={prefill} />;
    case "protect":
      return (
        <Protect
          navigate={navigate}
          onCheck={(text, type) => handOff(text, true, type)}
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
          navigate={navigate}
          onStaged={(text) => handOff(text, false)}
          onSubmit={(text, type, image) => handOff(text, true, type, image)}
        />
      );
  }
}
