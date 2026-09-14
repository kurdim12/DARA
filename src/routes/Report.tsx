import { useEffect, useState } from "react";
import {
  Banknote,
  Briefcase,
  CheckCircle2,
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
  Chip,
  ChipRow,
  FieldLabel,
  Header,
  IconRow,
  ListCard,
  Page,
  PrimaryButton,
  SectionHeading,
  Tag,
  Toggle,
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

/** The same mapping read backwards, so a verdict can choose the chip for you. */
const TYPE_FOR_CATEGORY: Partial<Record<Category, ThreatType>> = {
  impersonation_government: "phishing",
  impersonation_bank: "phishing",
  impersonation_telecom: "phishing",
  phishing_link: "phishing",
  otp_theft: "account_takeover",
  fake_prize: "financial_scam",
  fake_job: "fake_job",
  fake_shop: "financial_scam",
  investment: "financial_scam",
  parcel_customs: "financial_scam",
  traffic_fine: "financial_scam",
  police_threat: "cyber_extortion",
  extortion: "cyber_extortion",
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
  const [threatType, setThreatType] = useState<ThreatType>(
    prefill?.threatType ??
      (prefill?.category ? (TYPE_FOR_CATEGORY[prefill.category] ?? "other") : "phishing"),
  );
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
          <div className="reveal mt-6 flex flex-col items-center text-center">
            <span
              aria-hidden="true"
              className="flex size-16 items-center justify-center rounded-full bg-sky text-green"
            >
              <CheckCircle2 size={32} strokeWidth={2} />
            </span>
            <h2 className="t-title mt-4">{t("report.received")}</h2>
          </div>

          <CaseNumber value={caseNumber} />

          <p className="t-sub mt-6 leading-relaxed">{t("report.pilot_note")}</p>

          <div className="mt-6">
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

        <Card padded={false}>
          <IconRow
            Icon={User}
            title={t("report.anon_title")}
            sub={t("report.anon_sub")}
            trailing={
              <Toggle
                on={anonymous}
                onChange={() => setAnonymous((prev) => !prev)}
                label={t("report.anon_title")}
              />
            }
          />
        </Card>

        <div className="mt-6">
          <FieldLabel>{t("report.type_label")}</FieldLabel>
        </div>
        <div className="mt-2.5">
          <ChipRow>
            {THREAT_TYPES.map((option) => (
              <Chip
                key={option}
                Icon={THREAT_ICON[option]}
                label={t(`threat.${option}` as TextKey)}
                selected={option === threatType}
                onClick={() => setThreatType(option)}
              />
            ))}
          </ChipRow>
        </div>

        <div className="mt-6">
          <FieldLabel>{t("report.authority_label")}</FieldLabel>
        </div>
        <ListCard className="mt-2.5">
          {RELEVANT_AUTHORITIES.map((option) => {
            const selected = option === authority;
            return (
              <IconRow
                key={option}
                role="radio"
                selected={selected}
                onClick={() => setAuthority(option)}
                title={t(`authority.${option}` as TextKey)}
                lead={
                  <span
                    aria-hidden="true"
                    className={`flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? "border-blue" : "border-line"
                    }`}
                  >
                    {selected && <span className="size-[11px] rounded-full bg-blue" />}
                  </span>
                }
              />
            );
          })}
        </ListCard>

        <div className="mt-6">
          <FieldLabel>{t("report.what_label")}</FieldLabel>
        </div>
        <textarea
          dir={description.length > 0 ? "auto" : undefined}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("report.what_ph")}
          rows={4}
          maxLength={2000}
          className="mt-2.5 min-h-[120px] w-full resize-none rounded-btn border border-line bg-mist p-3.5 text-[15px] font-medium leading-relaxed text-ink outline-none placeholder:text-slate"
        />

        {!anonymous && (
          <div className="reveal">
            <div className="mt-6">
              <FieldLabel>{t("report.contact_label")}</FieldLabel>
            </div>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t("report.contact_ph")}
              className="mt-2.5 h-12 w-full rounded-btn border border-line bg-mist px-3.5 text-[15px] font-medium text-ink outline-none placeholder:text-slate"
            />
          </div>
        )}

        {failed && (
          <p
            role="alert"
            className="mt-5 rounded-btn bg-red-soft p-3 text-[14px] font-medium text-red-ink"
          >
            {t("error.generic")}
          </p>
        )}

        <div className="mt-6">
          <PrimaryButton
            arrow={false}
            loading={sending}
            disabled={description.trim().length < MIN_DESCRIPTION}
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
    <ListCard className="mt-3">
      {rows.map((row) => (
        <div key={row.case_number} className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <Tag>{t(`threat.${row.threat_type}` as TextKey)}</Tag>
            <span className="t-meta text-slate">{t("report.anonymous_tag")}</span>
          </div>
          <p dir="auto" className="mt-2 line-clamp-2 text-[14px] font-medium leading-snug text-slate">
            {row.description}
          </p>
        </div>
      ))}
    </ListCard>
  );
}
