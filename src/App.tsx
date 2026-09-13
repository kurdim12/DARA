import { useCallback, useState } from "react";
import { LangProvider } from "./i18n";
import { ThemeProvider } from "./lib/theme";
import { useRouter } from "./lib/router";
import { Home } from "./routes/Home";
import { Scan } from "./routes/Scan";
import { Threats } from "./routes/Threats";
import { Placeholder } from "./routes/Placeholder";
import { Report } from "./routes/Report";
import { Detect } from "./routes/Detect";
import { Reports } from "./routes/Reports";
import { Protection } from "./routes/Protection";
import { Educate } from "./routes/Educate";
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
  /** Text handed from Home to Scan, and whether Scan should check it at once. */
  const [seed, setSeed] = useState<{ text: string; run: boolean } | null>(null);
  const clearSeed = useCallback(() => setSeed(null), []);

  const handOff = useCallback(
    (text: string, run: boolean) => {
      setSeed({ text, run });
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
        <Placeholder
          navigate={navigate}
          active="home"
          title="tool.protect"
          sub="tool.protect_sub"
        />
      );
    case "learn":
      return (
        <Placeholder navigate={navigate} active="home" title="tool.learn" sub="tool.learn_sub" />
      );

    // Screens from the previous build, still mounted until their phase
    // replaces them.
    case "detect":
      return <Detect navigate={navigate} seedText={seed?.text ?? null} onSeedUsed={clearSeed} />;
    case "reports":
      return <Reports navigate={navigate} />;
    case "protection":
      return <Protection navigate={navigate} />;
    case "educate":
      return <Educate navigate={navigate} />;
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
