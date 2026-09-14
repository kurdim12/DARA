import { useEffect, useState } from "react";
import {
  Banknote,
  Briefcase,
  Check,
  Fish,
  Lock,
  Monitor,
  MoreHorizontal,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  RELEVANT_AUTHORITIES,
  THREAT_TYPES,
  type Category,
  type CommunityReport,
  type RelevantAuthority,
  type ThreatType,
} from "../../shared/types";
import { BottomNav } from "../components/BottomNav";
import { CaseNumber } from "../components/CaseNumber";
import {
  Card,
  Header,
  Page,
  PrimaryButton,
  FieldLabel,
  SectionHeading,
} from "../components/Shell";
import { sendReport } from "../lib/api";
import { isTestMode, rememberCase } from "../lib/storage";
import { useI18n, type TextKey } from "../i18n";
import type { Route } from "../lib/router";

/** Enough words that a reader can tell what happened. */
const MIN_DESCRIPTION = 20;

/**
 * The report row still needs a category, which is what the rest of the app
 * counts by. This is the reporter's own words mapped onto it as closely as it
 * goes; where it does not go, "other" is honest.
 */
const THREAT_ICON: Record<ThreatType, LucideIcon> = {
  phishing: Fish,
  financial_scam: Banknote,
  fake_job: Briefcase,
  cyber_extortion: Lock,
  account_takeover: Monitor,
  other: MoreHorizontal,
};

const CATEGORY_FOR: Record<ThreatType, Category> = {
  phishing: "phishing_link",
  financial_scam: "other",
  fake_job: "fake_job",
  cyber_extortion: "extortion",
  account_takeover: "other",
  other: "other",
};

export function Report({
  navigate,
  prefill,
}: {
  navigate: (route: Route) => void;
  /** Set when this was opened from a verdict. */
  prefill?: { threatType?: ThreatType; category?: Category; messageText?: string } | null;
}) {
  const { t } = useI18n();
  const [anonymous, setAnonymous] = useState(true);
  const [threatType, setThreatType] = useState<ThreatType>(prefill?.threatType ?? "phishing");
  const [authority, setAuthority] = useState<RelevantAuthority>("cybercrime_unit");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);

  async function submit() {
    setSending(true);
    setFailed(false);
    try {
      const response = await sendReport({
        source: "detect",
        category: prefill?.category ?? CATEGORY_FOR[threatType],
        threat_type: threatType,
        relevant_authority: authority,
        description: description.trim(),
        message_text: prefill?.messageText,
        anonymous,
        // Hidden means not sent. The Worker drops it again on its side.
        contact: anonymous ? undefined : contact.trim() || undefined,
        is_test: isTestMode(),
      });
      rememberCase(response.case_number, response.status);
      setCaseNumber(response.case_number);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  if (caseNumber) {
    return (
      <>
        <Page>
          <Header title={t("report.title")} />
          <div className="fade-in mt-7 flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Check size={28} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-[22px] font-semibold">{t("report.received")}</h2>
          </div>

          <CaseNumber value={caseNumber} />

          <p className="mt-5 text-[14px] leading-relaxed text-text-2">{t("report.pilot_note")}</p>

          <div className="mt-7">
            <PrimaryButton arrow={false} onClick={() => navigate("home")}>
              {t("report.back_home")}
            </PrimaryButton>
          </div>
        </Page>
        <BottomNav active="report" navigate={navigate} />
      </>
    );
  }

  return (
    <>
      <Page>
        <Header title={t("report.title")} />

        <Card className="mt-3 flex items-center gap-3 px-4 py-3.5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <User size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="flex-1">
            <span className="block text-[16px] font-semibold">{t("report.anon_title")}</span>
            <span className="block text-[14px] text-text-2">{t("report.anon_sub")}</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={anonymous}
            aria-label={t("report.anon_title")}
            onClick={() => setAnonymous((prev) => !prev)}
            className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors ${
              anonymous ? "bg-primary" : "bg-line"
            }`}
          >
            <span
              className={`absolute top-[3px] size-5 rounded-full bg-white transition-all ${
                anonymous ? "start-[21px]" : "start-[3px]"
              }`}
            />
          </button>
        </Card>

        <div className="mt-7">
          <FieldLabel>{t("report.type_label")}</FieldLabel>
        </div>
        <div className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4">
          {THREAT_TYPES.map((option) => {
            const selected = option === threatType;
            const Icon = THREAT_ICON[option];
            return (
              <button
                key={option}
                type="button"
                onClick={() => setThreatType(option)}
                aria-pressed={selected}
                className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-medium ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-card text-text-2"
                }`}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                {t(`threat.${option}` as TextKey)}
              </button>
            );
          })}
        </div>

        <div className="mt-7">
          <FieldLabel>{t("report.authority_label")}</FieldLabel>
        </div>
        <Card className="mt-2.5 divide-y divide-line">
          {RELEVANT_AUTHORITIES.map((option) => {
            const selected = option === authority;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setAuthority(option)}
                className="flex h-[52px] w-full items-center gap-3 px-4 text-start"
              >
                <span
                  aria-hidden="true"
                  className={`flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? "border-primary" : "border-line"
                  }`}
                >
                  {selected && <span className="size-[11px] rounded-full bg-primary" />}
                </span>
                <span className="text-[15px]">{t(`authority.${option}` as TextKey)}</span>
              </button>
            );
          })}
        </Card>

        <div className="mt-7">
          <FieldLabel>{t("report.what_label")}</FieldLabel>
        </div>
        <Card className="mt-2.5 px-4 py-3.5">
          <textarea
            dir={description.length > 0 ? "auto" : undefined}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("report.what_ph")}
            rows={4}
            maxLength={2000}
            className="min-h-[120px] w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-text-2"
          />
        </Card>

        {!anonymous && (
          <div className="fade-in">
            <div className="mt-7">
              <FieldLabel>{t("report.contact_label")}</FieldLabel>
            </div>
            <Card className="mt-2.5 px-4 py-3.5">
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={t("report.contact_ph")}
                className="h-9 w-full bg-transparent text-[15px] outline-none placeholder:text-text-2"
              />
            </Card>
          </div>
        )}

        {failed && (
          <p role="alert" className="mt-5 rounded-card bg-danger-soft p-3 text-[14px] text-danger">
            {t("error.generic")}
          </p>
        )}

        <div className="mt-7">
          <PrimaryButton
            arrow={false}
            disabled={sending || description.trim().length < MIN_DESCRIPTION}
            onClick={() => void submit()}
          >
            {sending ? t("report.sending") : t("report.submit")}
          </PrimaryButton>
        </div>

        <div className="mt-7">
          <SectionHeading>{t("report.community")}</SectionHeading>
        </div>
        <CommunityFeed />
      </Page>
      <BottomNav active="report" navigate={navigate} />
    </>
  );
}

/**
 * The last four reports someone has marked public. The feed reads a type and a
 * description and nothing else — no contact, ever, and nothing a visitor
 * submits becomes public on its own.
 */
function CommunityFeed() {
  const { t } = useI18n();
  const [rows, setRows] = useState<CommunityReport[]>([]);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await fetch("/api/reports/community");
        if (!res.ok) return;
        const body = (await res.json()) as { reports?: CommunityReport[] };
        if (live) setRows(body.reports ?? []);
      } catch {
        // An empty feed is the honest fallback.
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  if (rows.length === 0) return null;

  return (
    <Card className="mt-2.5 divide-y divide-line">
      {rows.map((row) => (
        <div key={row.case_number} className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-[22px] items-center rounded-full bg-primary-soft px-2 text-[11px] font-bold uppercase tracking-[0.04em] text-primary">
              {t(`threat.${row.threat_type}` as TextKey)}
            </span>
            <span className="text-[13px] text-text-2">{t("report.anonymous_tag")}</span>
          </div>
          <p dir="auto" className="mt-1.5 line-clamp-2 text-[14px] leading-snug text-text-2">
            {row.description}
          </p>
        </div>
      ))}
    </Card>
  );
}
