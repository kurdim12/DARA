import { useEffect, useState } from "react";
import {
  BookOpen,
  Briefcase,
  ChevronRight,
  Link2,
  MessageSquare,
  Phone,
  ShieldCheck,
  User,
  Wrench,
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
  { route: "learn", title: "tool.learn", sub: "tool.learn_sub", Icon: BookOpen },
  { route: "recover", title: "tool.recover", sub: "tool.recover_sub", Icon: Wrench },
  { route: "shield", title: "tool.shield", sub: "tool.shield_sub", Icon: User },
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

        <p className="mt-3 text-[14px] font-semibold text-primary">{t("home.eyebrow")}</p>
        <h1 className="mt-1 text-[30px] font-bold leading-[1.15] tracking-[-0.5px]">
          {t("home.h1")}
        </h1>
        <p className="mt-2 text-text-2">{t("home.sub")}</p>

        <Card className="mt-4 px-4 py-3.5">
          <textarea
            dir={text.length > 0 ? "auto" : undefined}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("home.placeholder")}
            rows={3}
            className="min-h-[84px] w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-text-2"
          />
          <ul className="mt-2.5 space-y-2 border-t border-line pt-3">
            {CAN_ANALYZE.map(({ key, Icon }) => (
              <li key={key} className="flex items-center gap-3 text-[14px] text-text-2">
                <Icon size={20} strokeWidth={1.75} className="shrink-0 text-primary" aria-hidden="true" />
                {t(key)}
              </li>
            ))}
          </ul>
        </Card>

        <div className="mt-2.5">
          <PrimaryButton
            arrowWhenDisabled
            disabled={text.trim().length === 0}
            onClick={() => onSubmit(text.trim())}
          >
            {t("home.analyze")}
          </PrimaryButton>
        </div>

        <div className="mt-7">
          <SectionHeading>{t("home.tools")}</SectionHeading>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          {TOOLS.map(({ route, title, sub, Icon }) => (
            <button
              key={route}
              type="button"
              onClick={() => navigate(route)}
              className="min-h-24 rounded-card border border-line bg-card p-[14px] text-start"
            >
              <Icon size={22} strokeWidth={1.75} className="text-primary" aria-hidden="true" />
              <span className="mt-2 block text-[16px] font-semibold leading-snug">{t(title)}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-text-2">{t(sub)}</span>
            </button>
          ))}
        </div>

        <div className="mt-7">
          <SectionHeading>{t("home.threats")}</SectionHeading>
        </div>
        {/* One card, hairlines between rows — the list reads as a list. */}
        <Card className="mt-2.5 overflow-hidden">
          <div className="divide-y divide-line">
            {threats.map((threat) => (
              <ThreatRow key={threat.id} threat={threat} count={counts[threat.category] ?? 0} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate("threats")}
            className="flex min-h-12 w-full items-center justify-center gap-1 border-t border-line text-[15px] font-semibold text-primary"
          >
            {t("home.threats_all")}
            <ChevronRight size={16} strokeWidth={1.75} className="rtl:rotate-180" aria-hidden="true" />
          </button>
        </Card>

        <div className="mt-7">
          <SectionHeading>{t("home.how")}</SectionHeading>
        </div>
        <Card className="mt-2.5 divide-y divide-line">
          {(["how.1", "how.2", "how.3"] as TextKey[]).map((key, index) => (
            <div key={key} className="flex gap-3 px-4 py-3.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[14px] font-semibold text-primary">
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
