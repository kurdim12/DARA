import { useEffect, useState } from "react";
import {
  Briefcase,
  ChevronRight,
  GraduationCap,
  LifeBuoy,
  Link2,
  MessageSquare,
  Phone,
  Shield,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { DemoTray } from "../components/DemoTray";
import { ThreatRow } from "../components/ThreatRow";
import { Card, Header, Page, PrimaryButton, SectionHeading } from "../components/Shell";
import { useI18n, type TextKey } from "../i18n";
import { allThreats, reportCounts } from "../lib/threats";
import type { Route } from "../lib/router";

const CAN_ANALYZE: { key: TextKey; Icon: LucideIcon }[] = [
  { key: "home.can_1", Icon: MessageSquare },
  { key: "home.can_2", Icon: Link2 },
  { key: "home.can_3", Icon: Phone },
  { key: "home.can_4", Icon: Briefcase },
];

const TOOLS: { route: Route; title: TextKey; sub: TextKey; Icon: LucideIcon }[] = [
  { route: "protect", title: "tool.protect", sub: "tool.protect_sub", Icon: ShieldCheck },
  { route: "learn", title: "tool.learn", sub: "tool.learn_sub", Icon: GraduationCap },
  { route: "recover", title: "tool.recover", sub: "tool.recover_sub", Icon: LifeBuoy },
  { route: "shield", title: "tool.shield", sub: "tool.shield_sub", Icon: Shield },
];

export function Home({
  navigate,
  onStaged,
  onSubmit,
}: {
  navigate: (route: Route) => void;
  onStaged: (text: string) => void;
  /** Carries the pasted text into Scan and runs it there. */
  onSubmit: (text: string) => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
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

  return (
    <>
      <Page>
        <Header onLogoLongPress={() => setTrayOpen(true)} />

        <p className="mt-4 text-[14px] font-semibold text-primary">{t("home.eyebrow")}</p>
        <h1 className="mt-1 text-[34px] font-bold leading-tight">{t("home.h1")}</h1>
        <p className="mt-3 text-text-2">{t("home.sub")}</p>

        <Card className="mt-6 p-4">
          <textarea
            dir={text.length > 0 ? "auto" : undefined}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("home.placeholder")}
            rows={4}
            className="w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-text-2"
          />
          <ul className="mt-3 space-y-2.5 border-t border-line pt-3">
            {CAN_ANALYZE.map(({ key, Icon }) => (
              <li key={key} className="flex items-center gap-3 text-[14px] text-text-2">
                <Icon size={20} className="shrink-0 text-primary" aria-hidden="true" />
                {t(key)}
              </li>
            ))}
          </ul>
        </Card>

        <div className="mt-4">
          <PrimaryButton disabled={text.trim().length === 0} onClick={() => onSubmit(text.trim())}>
            {t("home.analyze")}
          </PrimaryButton>
        </div>

        <SectionHeading>
          <span className="mt-9 block">{t("home.tools")}</span>
        </SectionHeading>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {TOOLS.map(({ route, title, sub, Icon }) => (
            <button
              key={route}
              type="button"
              onClick={() => navigate(route)}
              className="rounded-card border border-line bg-card p-4 text-start"
            >
              <Icon size={20} className="text-primary" aria-hidden="true" />
              <span className="mt-2.5 block font-semibold">{t(title)}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-text-2">{t(sub)}</span>
            </button>
          ))}
        </div>

        <SectionHeading>
          <span className="mt-9 block">{t("home.threats")}</span>
        </SectionHeading>
        <div className="mt-3 space-y-3">
          {threats.map((threat) => (
            <ThreatRow key={threat.id} threat={threat} count={counts[threat.category] ?? 0} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate("threats")}
          className="tap mt-3 flex items-center gap-1 text-[14px] font-semibold text-primary"
        >
          {t("home.threats_all")}
          <ChevronRight size={16} className="rtl:rotate-180" aria-hidden="true" />
        </button>

        <SectionHeading>
          <span className="mt-9 block">{t("home.how")}</span>
        </SectionHeading>
        <Card className="mt-3 divide-y divide-line">
          {(["how.1", "how.2", "how.3"] as TextKey[]).map((key, index) => (
            <div key={key} className="flex gap-3 p-4">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary">
                <bdi>{index + 1}</bdi>
              </span>
              <p className="text-[15px] leading-snug">{t(key)}</p>
            </div>
          ))}
        </Card>

        {trayOpen && (
          <DemoTray
            onClose={() => setTrayOpen(false)}
            onPick={(staged) => {
              setTrayOpen(false);
              onStaged(staged);
            }}
          />
        )}
      </Page>
      <BottomNav active="home" navigate={navigate} />
    </>
  );
}
