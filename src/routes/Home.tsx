import { useEffect, useState } from "react";
import { BookOpen, ChevronRight, ShieldCheck, User, Wrench } from "lucide-react";
import type { AnalysisType, AnalyzeImage } from "../../shared/types";
import { BottomNav } from "../components/BottomNav";
import { DemoTray } from "../components/DemoTray";
import { Logo } from "../components/Logo";
import { ScannerCard } from "../components/ScannerCard";
import { ThreatRow } from "../components/ThreatRow";
import { TypeChips } from "../components/TypeChips";
import {
  BleedPage,
  Gutter,
  ListCard,
  Pills,
  PrimaryButton,
  Tile,
} from "../components/Shell";
import { useI18n, type TextKey } from "../i18n";
import { allThreats, reportCounts } from "../lib/threats";
import type { Route } from "../lib/router";

const TOOLS = [
  { route: "protect", title: "tool.protect", sub: "tool.protect_sub", Icon: ShieldCheck },
  { route: "learn", title: "tool.learn", sub: "tool.learn_sub", Icon: BookOpen },
  { route: "recover", title: "tool.recover", sub: "tool.recover_sub", Icon: Wrench },
  { route: "shield", title: "tool.shield", sub: "tool.shield_sub", Icon: User },
] satisfies { route: Route; title: TextKey; sub: TextKey; Icon: typeof User }[];

export function Home({
  navigate,
  onStaged,
  onSubmit,
}: {
  navigate: (route: Route) => void;
  onStaged: (text: string) => void;
  /** Carries what was pasted or picked into Scan and runs it there. */
  onSubmit: (text: string, type: AnalysisType, image: AnalyzeImage | null) => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [type, setType] = useState<AnalysisType>("message");
  const [image, setImage] = useState<AnalyzeImage | null>(null);
  const [errorKey, setErrorKey] = useState<TextKey | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let live = true;
    void reportCounts().then((next) => live && setCounts(next));
    return () => {
      live = false;
    };
  }, []);

  const threats = allThreats().slice(0, 3);
  const ready = text.trim().length > 0 || image !== null;

  return (
    <>
      <BleedPage>
        {/* The mark, the question, and the box you paste into. Paper, not a
            coloured slab: red belongs on the tile, the one action, a danger
            verdict, a flagged span and the shield — nowhere else. */}
        <div
          style={{
            paddingTop: "max(54px, env(safe-area-inset-top))",
            paddingInline: 20,
            paddingBottom: 20,
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <Logo onLongPress={() => setTrayOpen(true)} />
            <Pills />
          </div>

          <h1 className="t-hero mt-6">{t("home.h1")}</h1>
          <p className="t-body mt-2 max-w-[310px] text-ink-2">{t("home.sub")}</p>
        </div>

        <Gutter>
          <ScannerCard
            variant="home"
            text={text}
            onText={setText}
            placeholder={t("home.placeholder")}
            label={t("home.analyze")}
            image={image}
            onImage={(next) => {
              setImage(next);
              if (next) setErrorKey(null);
            }}
            onError={setErrorKey}
            chips={<TypeChips value={type} onChange={setType} />}
            submit={
              <PrimaryButton
                disabled={!ready}
                onClick={() => onSubmit(text.trim(), type, image)}
              >
                {t("home.analyze")}
              </PrimaryButton>
            }
          />

          {errorKey && (
            <p role="alert" className="mt-3 rounded-btn bg-red-soft p-3 text-[14px] font-medium text-red-ink">
              {t(errorKey)}
            </p>
          )}

          <h2 className="t-h3 mt-9">{t("home.tools")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {TOOLS.map(({ route, title, sub, Icon }) => (
              <Tile
                key={route}
                Icon={Icon}
                title={t(title)}
                sub={t(sub)}
                onClick={() => navigate(route)}
              />
            ))}
          </div>

          <h2 className="t-h3 mt-9">{t("home.threats")}</h2>
          <ListCard className="mt-3">
            {threats.map((threat) => (
              <ThreatRow key={threat.id} threat={threat} count={counts[threat.category] ?? 0} />
            ))}
            <button
              type="button"
              onClick={() => navigate("threats")}
              className="flex min-h-12 w-full items-center justify-center gap-1 text-[15px] font-bold text-ink"
            >
              {t("home.threats_all")}
              <ChevronRight size={16} strokeWidth={1.75} className="rtl:rotate-180" aria-hidden="true" />
            </button>
          </ListCard>

          <h2 className="t-h3 mt-9">{t("home.how")}</h2>
          <ol className="mt-4 space-y-4">
            {(["how.1", "how.2", "how.3"] as TextKey[]).map((key, index) => (
              <li key={key} className="flex gap-3.5">
                <span className="tnum w-5 shrink-0 pt-0.5 text-[15px] font-extrabold leading-tight text-ink">
                  <bdi>{index + 1}</bdi>
                </span>
                <p className="t-body flex-1 text-ink-2">{t(key)}</p>
              </li>
            ))}
          </ol>

        </Gutter>

        {trayOpen && (
          <DemoTray
            onClose={() => setTrayOpen(false)}
            onPick={(staged) => {
              setTrayOpen(false);
              onStaged(staged);
            }}
          />
        )}
      </BleedPage>
      <BottomNav active="home" navigate={navigate} />
    </>
  );
}
