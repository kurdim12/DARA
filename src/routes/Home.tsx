import { useState } from "react";
import { BookOpen, ChevronRight, ShieldAlert, ShieldCheck, Wrench } from "lucide-react";
import type { AnalysisType, AnalyzeImage } from "../../shared/types";
import { BottomNav } from "../components/BottomNav";
import { DemoTray } from "../components/DemoTray";
import { Logo } from "../components/Logo";
import { ScannerCard } from "../components/ScannerCard";
import { TypeChips } from "../components/TypeChips";
import {
  BleedPage,
  Gutter,
  ListCard,
  Pills,
  PrimaryButton,
  Tag,
  Tile,
} from "../components/Shell";
import { useI18n, type TextKey } from "../i18n";
import { campaignDate, campaigns } from "../lib/campaigns";
import { listCases } from "../lib/storage";
import type { Route } from "../lib/router";

/**
 * Every report the API writes today comes back `received`, and that is the only
 * status with wording. Anything else falls back rather than printing a raw key
 * onto the screen.
 */
const STATUS_KEYS: Record<string, TextKey> = { received: "status.received" };

const TOOLS = [
  { route: "protect", title: "ft.home.tool_dir", sub: "ft.home.tool_dir_sub", Icon: ShieldCheck },
  { route: "learn", title: "ft.home.tool_train", sub: "ft.home.tool_train_sub", Icon: BookOpen },
  { route: "recover", title: "tool.recover", sub: "tool.recover_sub", Icon: Wrench },
  { route: "shield", title: "tool.shield", sub: "tool.shield_sub", Icon: ShieldAlert },
] satisfies { route: Route; title: TextKey; sub: TextKey; Icon: typeof Wrench }[];

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
  const { t, lang } = useI18n();
  const [text, setText] = useState("");
  const [type, setType] = useState<AnalysisType>("message");
  const [image, setImage] = useState<AnalyzeImage | null>(null);
  const [errorKey, setErrorKey] = useState<TextKey | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const strip = campaigns(lang).slice(0, 3);
  const latest = listCases()[0];
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

          <h2 className="t-h3 mt-9">{t("ft.home.tools")}</h2>
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

          {/* The three newest documented campaigns, each with the date and
              the source that reported it. The patterns list is one tap away
              inside Radar — a pattern and an incident are different claims and
              Home should not blur them. */}
          <h2 className="t-h3 mt-9">{t("camp.title")}</h2>
          <p className="t-sub mt-1">{t("camp.sub")}</p>
          <ListCard className="mt-3">
            {strip.map((campaign) => (
              <article key={campaign.id} className="px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone="danger">{t(`channel.${campaign.channel}` as TextKey)}</Tag>
                  <span className="t-meta text-ink-2">
                    <bdi>{campaignDate(campaign.date, lang)}</bdi>
                  </span>
                </div>
                <h3 dir="auto" className="t-row mt-2">{campaign.title}</h3>
                {campaign.summary && (
                  <p dir="auto" className="t-sub mt-1 line-clamp-2">
                    {campaign.summary}
                  </p>
                )}
                <p dir="auto" className="t-meta mt-1.5 truncate text-ink-2">
                  {campaign.sourceName}
                </p>
              </article>
            ))}
            <button
              type="button"
              onClick={() => navigate("radar")}
              className="flex min-h-12 w-full items-center justify-center gap-1 text-[15px] font-bold text-ink"
            >
              {t("radar.title")}
              <ChevronRight size={16} strokeWidth={1.75} className="rtl:rotate-180" aria-hidden="true" />
            </button>
          </ListCard>

          {latest && (
            <>
              <h2 className="t-h3 mt-9">{t("home.last_report")}</h2>
              <button
                type="button"
                onClick={() => navigate("report")}
                className="press mt-3 flex w-full items-center gap-3 rounded-card border border-line bg-card px-4 py-3.5 text-start"
              >
                <span className="min-w-0 flex-1">
                  <bdi className="tnum block text-[17px] font-extrabold">{latest.case_number}</bdi>
                  <span className="t-sub mt-0.5 block">
                    {t(STATUS_KEYS[latest.status ?? ""] ?? "status.received")}
                  </span>
                </span>
                <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-2 rtl:rotate-180" />
              </button>
            </>
          )}

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
