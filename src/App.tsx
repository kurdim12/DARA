import { useCallback, useState } from "react";
import type { AnalysisType } from "../shared/types";
import { LangProvider } from "./i18n";
import { ThemeProvider } from "./lib/theme";
import { useRouter } from "./lib/router";
import { Home } from "./routes/Home";
import { Scan } from "./routes/Scan";
import { Threats } from "./routes/Threats";
import { Report } from "./routes/Report";
import { Protect } from "./routes/Protect";
import { Learn } from "./routes/Learn";
import { Recover } from "./routes/Recover";
import { Shield } from "./routes/Shield";
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
  /** Text handed to Scan, the chip to land on, and whether to run it at once. */
  const [seed, setSeed] = useState<{
    text: string;
    run: boolean;
    type?: AnalysisType;
  } | null>(null);
  const clearSeed = useCallback(() => setSeed(null), []);

  const handOff = useCallback(
    (text: string, run: boolean, type?: AnalysisType) => {
      setSeed({ text, run, type });
      navigate("scan");
    },
    [navigate],
  );

  switch (route) {
    case "scan":
      return <Scan navigate={navigate} seed={seed} onSeedUsed={clearSeed} />;
    case "threats":
      return <Threats navigate={navigate} />;
    case "report":
      return <Report navigate={navigate} />;
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
          onSubmit={(text) => handOff(text, true)}
        />
      );
  }
}
