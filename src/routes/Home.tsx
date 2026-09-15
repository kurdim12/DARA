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
            status bar is navy on this screen. A gradient and one soft light
            rather than a flat slab — the difference between a brand and a
            colour swatch. */}
        <div
          className="relative overflow-hidden text-white"
          style={{
            background:
              "linear-gradient(160deg, var(--navy) 0%, var(--navy) 38%, var(--navy-deep) 100%)",
            paddingTop: "max(54px, env(safe-area-inset-top))",
            paddingInline: 20,
            paddingBottom: 80,
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -end-20 -top-24 size-72 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0) 70%)",
            }}
          />

          <div className="relative flex items-start justify-between gap-3">
            <Logo onLongPress={() => setTrayOpen(true)} />
            <Pills onNavy />
          </div>

          <h1 className="t-hero relative mt-7">{t("home.h1")}</h1>
          <p className="relative mt-2.5 max-w-[310px] text-[14.5px] font-medium leading-[1.45] text-white/75">
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
              className="flex min-h-12 w-full items-center justify-center gap-1 text-[15px] font-bold text-blue"
            >
              {t("home.threats_all")}
              <ChevronRight size={16} strokeWidth={2.25} className="rtl:rotate-180" aria-hidden="true" />
            </button>
          </ListCard>

          <h2 className="t-h3 mt-9">{t("home.how")}</h2>
          <ol className="mt-4 space-y-4">
            {(["how.1", "how.2", "how.3"] as TextKey[]).map((key, index) => (
              <li key={key} className="flex gap-3.5">
                <span className="tnum w-5 shrink-0 pt-0.5 text-[15px] font-extrabold leading-tight text-blue">
                  <bdi>{index + 1}</bdi>
                </span>
                <p className="t-body flex-1 text-slate">{t(key)}</p>
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
