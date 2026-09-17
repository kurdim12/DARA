import { ExternalLink, House, Monitor, Phone, Shield as ShieldIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { IconBox, ListCard } from "./Shell";
import { useI18n } from "../i18n";
import { contacts, type Contact } from "../lib/verified";
import type { IconTone } from "./Shell";

/** Family Protection first, the police last: the order the screen was designed in. */
const ORDER = ["family_protection", "cybercrime_unit", "emergency"];

const ICON: Record<string, LucideIcon> = {
  family_protection: House,
  cybercrime_unit: Monitor,
  emergency: ShieldIcon,
};

/** The file's own tone names, in the palette's. */
const TONE: Record<Contact["tone"], IconTone> = {
  primary: "neutral",
  warn: "amber",
  danger: "red",
};

/** tel: wants digits, not the spacing a number is written with. */
const dial = (number: string) => `tel:${number.replace(/[^\d+]/g, "")}`;

/** "https://www.psd.gov.jo/" reads as "psd.gov.jo" under a line it vouches for. */
function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * The official lines, on the two screens that offer them.
 *
 * One renderer, because the Shield screen and the Help screen were each
 * drawing their own and had drifted: the same directorate appeared under two
 * names, and a row with nothing to dial showed a "pending verification" tag —
 * which, to someone in trouble, is the app shrugging.
 *
 * Nothing here can be pending any more. A row either dials a number that has a
 * source and a date under it, or it says plainly why there is no number and
 * opens the body's own page instead. The Family Protection directorate is the
 * second kind: it publishes one number per governorate, so any single number
 * shown as THE number sends most people to the wrong one.
 */
export function HelpLines() {
  const { t, lang } = useI18n();
  const all = contacts(lang);
  const byId = new Map(all.map((entry) => [entry.id, entry]));
  const lines = ORDER.map((id) => byId.get(id)).filter((entry) => entry !== undefined);

  return (
    <ListCard>
      {lines.map((line) => (
        <div key={line.id} className="px-4 py-3.5">
          <div className="flex items-start gap-3">
            <IconBox Icon={ICON[line.id] ?? Phone} tone={TONE[line.tone]} />
            <div className="min-w-0 flex-1">
              <p className="t-row">{line.label}</p>
              {line.affiliation && <p className="t-sub mt-0.5">{line.affiliation}</p>}
              {line.whenToCall && <p className="t-sub mt-1 text-ink">{line.whenToCall}</p>}
            </div>
          </div>

          <div className="mt-2.5 space-y-2">
            {line.number ? (
              <>
                <CallButton number={line.number} label={t("shield.call")} />
                {line.extensions.length > 0 && (
                  <p className="t-sub text-[12.5px]">
                    <bdi className="tnum">
                      {t("shield.ext").replace("{e}", line.extensions.join(" / "))}
                    </bdi>
                    {line.dialNote && <> — {line.dialNote}</>}
                  </p>
                )}
                {line.free && <p className="t-sub text-[12.5px]">{t("help.free_line")}</p>}
              </>
            ) : (
              <>
                {/* Not "pending": a fact about this body, said out loud, so
                    nobody later "fixes" it by picking one governorate. */}
                {line.whyNoNumber && <p className="t-sub text-[12.5px]">{line.whyNoNumber}</p>}
                <RouteToEmergency line={line} byId={byId} />
                {line.officialUrl && (
                  <a
                    href={line.officialUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="press flex min-h-12 w-full items-center justify-center gap-2 rounded-btn border border-ink bg-card px-4 text-[15px] font-bold text-ink"
                  >
                    <ExternalLink size={17} strokeWidth={1.75} aria-hidden="true" />
                    {t("help.open_official")}
                  </a>
                )}
              </>
            )}

            {line.email && (
              <p className="t-sub text-[12.5px]">
                {t("help.email_label")}{" "}
                <a href={`mailto:${line.email}`} className="font-bold text-ink underline">
                  <bdi dir="ltr">{line.email}</bdi>
                </a>
              </p>
            )}

            {line.also && <p className="t-sub text-[12.5px]">{line.also}</p>}

            {/* The honesty line, and it opens. A judge who asks "where did
                this number come from?" is answered by the screen rather than
                by the presenter, and can check it on the spot. */}
            {line.sourceUrl && line.verifiedOn && (
              <p className="t-sub text-[12px]">
                {t("help.source")
                  .split(/(\{s\}|\{d\})/)
                  .map((part, index) =>
                    part === "{s}" ? (
                      <a
                        key={index}
                        href={line.sourceUrl!}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="font-bold text-ink underline"
                      >
                        <bdi dir="ltr">{host(line.sourceUrl!)}</bdi>
                      </a>
                    ) : part === "{d}" ? (
                      <bdi key={index} dir="ltr" className="tnum">
                        {line.verifiedOn}
                      </bdi>
                    ) : (
                      part
                    ),
                  )}
              </p>
            )}
          </div>
        </div>
      ))}
    </ListCard>
  );
}

/**
 * The one thing a row with a number does. Full width, because thumbs, and the
 * number leads because that is what the person is looking for — the label is
 * the small word beside it, never the other way round.
 *
 * "urgent" is the outlined red variant. The Shield screen already carries one
 * solid red block for immediate danger; a second one inside the quiet list
 * would compete with it, and red that is everywhere stops meaning anything.
 */
function CallButton({
  number,
  label,
  urgent = false,
}: {
  number: string;
  label: string;
  urgent?: boolean;
}) {
  const skin = urgent
    ? "border-2 border-red bg-card text-red-ink"
    : "bg-ink text-paper";

  return (
    <a
      href={dial(number)}
      className={`press flex min-h-12 w-full items-center justify-center gap-2.5 rounded-btn px-4 text-[17px] font-extrabold ${skin}`}
    >
      <Phone size={18} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
      <bdi dir="ltr" className="tnum">
        {number}
      </bdi>
      <span className="min-w-0 text-[13.5px] font-bold opacity-80">{label}</span>
    </a>
  );
}

/**
 * What to do instead, for a body with no number of its own. It borrows the
 * emergency line's number rather than repeating one here, so there is exactly
 * one place in this repository where 911 is written down.
 */
function RouteToEmergency({ line, byId }: { line: Contact; byId: Map<string, Contact> }) {
  const { t } = useI18n();
  const target = line.routeTo ? byId.get(line.routeTo) : undefined;
  if (!target?.number) return null;

  return <CallButton number={target.number} label={t("help.in_danger")} urgent />;
}
