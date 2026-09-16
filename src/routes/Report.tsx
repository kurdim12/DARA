import { useEffect, useState } from "react";
import {
  Banknote,
  Briefcase,
  CheckCircle2,
  Copy,
  Download,
  Fish,
  Lock,
  Monitor,
  MoreHorizontal,
  UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CHANNELS,
  RELEVANT_AUTHORITIES,
  THREAT_TYPES,
  type Category,
  type Channel,
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
import { isTestMode, listCases, rememberCase } from "../lib/storage";
import { officialLink } from "../lib/verified";
import { useI18n, type TextKey } from "../i18n";
import type { Route } from "../lib/router";

/** Enough words that a reader can tell what happened. */
const MIN_DESCRIPTION = 20;

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

/**
 * Always anonymous. There is no toggle and no contact field, because the
 * reference flow does not ask and this app has nothing to do with an answer:
 * the Worker's contact column and its handling are untouched, so the path is
 * there if it is ever wanted back.
 */
export function Report({
  navigate,
  prefill,
}: {
  navigate: (route: Route) => void;
  prefill?: { threatType?: ThreatType; category?: Category; messageText?: string } | null;
}) {
  const { t, lang } = useI18n();
  const [threatType, setThreatType] = useState<ThreatType>(
    prefill?.threatType ??
      (prefill?.category ? (TYPE_FOR_CATEGORY[prefill.category] ?? "other") : "phishing"),
  );
  const [channel, setChannel] = useState<Channel>("sms");
  const [entity, setEntity] = useState("");
  const [authority, setAuthority] = useState<RelevantAuthority>("cybercrime_unit");
  const [description, setDescription] = useState("");
  const [attach, setAttach] = useState(Boolean(prefill?.messageText));
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  const jocert = officialLink("jocert_form", lang);

  async function submit() {
    setSending(true);
    setFailed(false);
    try {
      const response = await sendReport({
        source: "detect",
        category: prefill?.category ?? CATEGORY_FOR[threatType],
        threat_type: threatType,
        relevant_authority: authority,
        channel,
        impersonated_entity: entity.trim() || undefined,
        description: description.trim(),
        message_text: attach ? prefill?.messageText : undefined,
        anonymous: true,
        is_test: isTestMode(),
      });
      rememberCase(response.case_number, response.status);
      setReceipt(response.case_number);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  if (receipt) {
    return (
      <Receipt
        caseNumber={receipt}
        threatType={threatType}
        channel={channel}
        entity={entity.trim()}
        navigate={navigate}
      />
    );
  }

  return (
    <>
      <Page>
        <Header title={t("rep.title")} />
        <p className="t-sub -mt-1.5">{t("rep.sub")}</p>

        <Card padded={false} className="mt-4">
          <IconRow
            Icon={UserCheck}
            title={t("rep.anon")}
            sub={t("rep.anon_note")}
            trailing={
              <span className="t-meta shrink-0 rounded-full bg-line px-2.5 py-1 text-ink-2">
                {t("rep.anon_badge")}
              </span>
            }
          />
        </Card>

        <div className="mt-6">
          <FieldLabel>{t("rep.category")}</FieldLabel>
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
          <FieldLabel>{t("rep.channel")}</FieldLabel>
        </div>
        <div className="mt-2.5">
          <ChipRow>
            {CHANNELS.map((option) => (
              <Chip
                key={option}
                label={t(`channel.${option}` as TextKey)}
                selected={option === channel}
                onClick={() => setChannel(option)}
              />
            ))}
          </ChipRow>
        </div>

        <div className="mt-6">
          <FieldLabel>{t("rep.entity")}</FieldLabel>
        </div>
        <input
          type="text"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          placeholder={t("rep.entity_ph")}
          dir="auto"
          className="mt-2.5 h-12 w-full rounded-btn border border-line bg-paper px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-2"
        />

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
          className="mt-2.5 min-h-[120px] w-full resize-none rounded-btn border border-line bg-paper p-3.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-2"
        />

        {prefill?.messageText && (
          <Card padded={false} className="mt-2.5">
            <IconRow
              title={t("rep.attach")}
              sub={t("rep.from_scan")}
              trailing={
                <Toggle small on={attach} onChange={() => setAttach((v) => !v)} label={t("rep.attach")} />
              }
            />
          </Card>
        )}

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
                      selected ? "border-ink" : "border-line"
                    }`}
                  >
                    {selected && <span className="size-[11px] rounded-full bg-ink" />}
                  </span>
                }
              />
            );
          })}
        </ListCard>

        {isTestMode() && <p className="t-sub mt-3 text-amber-ink">{t("rep.test_mode")}</p>}

        {failed && (
          <p role="alert" className="mt-5 rounded-btn bg-red-soft p-3 text-[14px] font-medium text-red-ink">
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
            {sending ? t("rep.sending") : t("rep.send")}
          </PrimaryButton>
        </div>

        {/* The sentence that answers the hardest question in the room, before
            anyone asks it. The official route is a separate link, and it only
            appears once somebody has confirmed the form is the right one. */}
        <p className="t-sub mt-3 text-center text-[12px] leading-relaxed">
          {t("rep.footer")}
          {jocert && (
            <>
              <br />
              {t("rep.footer_official")}{" "}
              <a
                href={jocert.url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-bold text-ink underline underline-offset-2"
              >
                {jocert.label}
              </a>
            </>
          )}
        </p>

        <div className="mt-7">
          <SectionHeading>{t("reports.title")}</SectionHeading>
          <p className="t-sub mt-1">{t("reports.subtitle")}</p>
        </div>
        <MyReports navigate={navigate} />

        <div className="mt-7">
          <SectionHeading>{t("report.community")}</SectionHeading>
          <p className="t-sub mt-1">{t("report.community_sub")}</p>
        </div>
        <CommunityFeed />
      </Page>
      <BottomNav active="report" navigate={navigate} />
    </>
  );
}

/**
 * The receipt. A case number, what was sent, and the sentence that says where
 * it went — which is DARA', a pilot, and not an official body.
 */
function Receipt({
  caseNumber,
  threatType,
  channel,
  entity,
  navigate,
}: {
  caseNumber: string;
  threatType: ThreatType;
  channel: Channel;
  entity: string;
  navigate: (route: Route) => void;
}) {
  const { t } = useI18n();
  const [saved, setSaved] = useState(false);

  const rows: { key: TextKey; value: string }[] = [
    { key: "rcpt.case", value: caseNumber },
    { key: "rcpt.type", value: t(`threat.${threatType}` as TextKey) },
    { key: "rcpt.channel", value: t(`channel.${channel}` as TextKey) },
    ...(entity ? [{ key: "rcpt.entity" as TextKey, value: entity }] : []),
    { key: "rcpt.identity", value: t("rcpt.anon") },
    { key: "rcpt.status", value: t("status.received") },
  ];

  /**
   * Save the receipt. An image is the thing worth keeping, so a canvas is
   * tried first; where the clipboard will not take one — most mobile browsers
   * — the same lines go over as text, which still survives being pasted into
   * a message to someone.
   */
  async function save() {
    const text = rows.map((row) => `${t(row.key)}: ${row.value}`).join("\n");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 120 + rows.length * 64;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#C40C29";
      ctx.fillRect(0, 0, canvas.width, 8);
      ctx.fillStyle = "#141414";
      ctx.font = "800 30px system-ui, sans-serif";
      ctx.fillText(t("sh2.card_brand"), 40, 70);
      ctx.font = "400 20px system-ui, sans-serif";
      ctx.fillStyle = "#5A5654";
      ctx.fillText(t("rcpt.sub"), 40, 102);
      rows.forEach((row, index) => {
        const y = 160 + index * 64;
        ctx.fillStyle = "#5A5654";
        ctx.font = "400 18px system-ui, sans-serif";
        ctx.fillText(t(row.key), 40, y);
        ctx.fillStyle = "#141414";
        ctx.font = "700 22px system-ui, sans-serif";
        ctx.fillText(row.value, 40, y + 28);
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("no blob");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    } catch {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        return;
      }
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <>
      <Page>
        <Header title={t("rcpt.title")} />

        <div className="reveal mt-4 flex flex-col items-center text-center">
          <span
            aria-hidden="true"
            className="flex size-16 items-center justify-center rounded-full bg-line text-green"
          >
            <CheckCircle2 size={32} strokeWidth={1.75} />
          </span>
          <h2 className="t-title mt-4">{t("rcpt.sub")}</h2>
        </div>

        <CaseNumber value={caseNumber} />

        <Card padded={false} className="mt-6">
          <dl className="divide-y divide-line">
            {rows.slice(1).map((row) => (
              <div key={row.key} className="flex flex-wrap items-baseline gap-x-3 px-4 py-3">
                <dt className="t-meta min-w-[96px] text-ink-2">{t(row.key)}</dt>
                <dd dir="auto" className="t-body min-w-0 flex-1 text-[14px]">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <button
          type="button"
          onClick={() => void save()}
          aria-live="polite"
          className="press mt-2.5 flex h-12 w-full items-center justify-center gap-2 rounded-btn border border-line bg-card text-[15px] font-bold text-ink"
        >
          {saved ? (
            <Copy size={17} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Download size={17} strokeWidth={1.75} aria-hidden="true" />
          )}
          {saved ? t("rcpt.saved") : t("rcpt.save")}
        </button>

        <p className="t-sub mt-5 leading-relaxed">{t("report.pilot_note")}</p>
        {/* The reference's rcpt.note also says "follow the status from My
            reports", and this build has no such screen. Only the half that is
            true about this app renders. */}
        <p className="t-sub mt-2 text-[12px] leading-relaxed">{t("reports.privacy")}</p>

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
          <div className="flex flex-wrap items-center gap-2">
            <Tag>{t(`threat.${row.threat_type}` as TextKey)}</Tag>
            <span className="t-meta text-ink-2">{t("report.anonymous_tag")}</span>
            {row.is_seed && (
              <span className="t-meta rounded-[6px] border border-line px-1.5 py-0.5 text-ink-2">
                {t("report.seeded")}
              </span>
            )}
          </div>
          <p dir="auto" className="mt-2 line-clamp-2 text-[14px] leading-snug text-ink-2">
            {row.description}
          </p>
        </div>
      ))}
    </ListCard>
  );
}

/**
 * Every case number this device has sent, newest first. The tab is called
 * بلاغاتي, so it has to contain more than a blank form.
 *
 * Nothing is fetched. The status shown is what the API said when the report
 * went in, and the line underneath says the numbers live here and nowhere
 * else — which is true: `rememberCase` writes to localStorage and the Worker
 * keeps no link between a device and a row.
 */
function MyReports({ navigate }: { navigate: (route: Route) => void }) {
  const { t } = useI18n();
  const cases = listCases();

  if (cases.length === 0) {
    return (
      <Card className="mt-3">
        <p className="t-row">{t("reports.empty_title")}</p>
        <p className="t-sub mt-1">{t("reports.empty_sub")}</p>
        <button
          type="button"
          onClick={() => navigate("scan")}
          className="press mt-3 flex h-11 w-full items-center justify-center rounded-btn border border-line bg-paper text-[14px] font-bold text-ink"
        >
          {t("reports.empty_cta")}
        </button>
      </Card>
    );
  }

  return (
    <>
      <ListCard className="mt-3">
        {cases.map((entry) => (
          <div key={entry.case_number} className="flex items-center gap-3 px-4 py-3.5">
            <span className="min-w-0 flex-1">
              <bdi className="tnum block text-[16px] font-extrabold">{entry.case_number}</bdi>
              <span className="t-sub mt-0.5 block">{t("status.received")}</span>
            </span>
          </div>
        ))}
      </ListCard>
      <p className="t-sub mt-2 text-[12px]">{t("reports.privacy")}</p>
    </>
  );
}
