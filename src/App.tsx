import { useCallback, useState } from "react";
import { LangProvider } from "./i18n";
import { useRouter } from "./lib/router";
import { Home } from "./routes/Home";
import { Detect } from "./routes/Detect";
import { Shield } from "./routes/Shield";
import { Lab } from "./routes/Lab";

export default function App() {
  return (
    <LangProvider>
      <Screens />
    </LangProvider>
  );
}

function Screens() {
  const { route, navigate, quickExit } = useRouter();
  const [seedText, setSeedText] = useState<string | null>(null);
  const clearSeed = useCallback(() => setSeedText(null), []);

  switch (route) {
    case "detect":
      return <Detect navigate={navigate} seedText={seedText} onSeedUsed={clearSeed} />;
    case "shield":
      return <Shield onExit={quickExit} onHome={() => navigate("home")} />;
    case "lab":
      return <Lab />;
    default:
      return (
        <Home
          navigate={navigate}
          onStaged={(text) => {
            setSeedText(text);
            navigate("detect");
          }}
        />
      );
  }
}
