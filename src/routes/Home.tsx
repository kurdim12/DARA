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
        {/* The hero. The only navy surface in the app, and the reason the
            status bar is navy on this screen. */}
        <div
          className="relative overflow-hidden bg-navy text-white"
          style={{
            paddingTop: "max(54px, env(safe-area-inset-top))",
            paddingInline: 20,
            paddingBottom: 78,
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -end-16 -top-10 size-56 rounded-full bg-white/[0.06]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -start-12 size-52 rounded-full bg-white/[0.05]"
          />

          <div className="relative flex items-start justify-between gap-3">
            <Logo onLongPress={() => setTrayOpen(true)} />
            <Pills onNavy />
          </div>

          <h1 className="t-hero relative mt-6">{t("home.h1")}</h1>
          <p className="relative mt-2 max-w-[300px] text-[14px] font-medium leading-snug text-white/85">
            {t("home.sub")}
          </p>
        </div>

        <Gutter className="relative z-10 -mt-14">
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

          <h2 className="t-h3 mt-7">{t("home.tools")}</h2>
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

          <h2 className="t-h3 mt-7">{t("home.threats")}</h2>
          <ListCard className="mt-3">
            {threats.map((threat) => (
              <ThreatRow key={threat.id} threat={threat} count={counts[threat.category] ?? 0} />
            ))}
            <button
              type="button"
              onClick={() => navigate("threats")}
              className="flex min-h-12 w-full items-center justify-center gap-1 text-[15px] font-bold text-blue"
            >
              {t("home.threats_all")}
              <ChevronRight size={16} strokeWidth={2.25} className="rtl:rotate-180" aria-hidden="true" />
            </button>
          </ListCard>

          <h2 className="t-h3 mt-7">{t("home.how")}</h2>
          <ListCard className="mt-3">
            {(["how.1", "how.2", "how.3"] as TextKey[]).map((key, index) => (
              <div key={key} className="flex min-h-16 items-center gap-3 px-4 py-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sky text-[13px] font-extrabold text-blue-ink">
                  <bdi className="tnum">{index + 1}</bdi>
                </span>
                <p className="t-body flex-1">{t(key)}</p>
              </div>
            ))}
          </ListCard>
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
