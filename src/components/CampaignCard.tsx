import { ArrowUpRight, ScanLine } from "lucide-react";
import { Card, Tag } from "./Shell";
import { useI18n, type TextKey } from "../i18n";
import { campaignDate, type Campaign } from "../lib/campaigns";

/**
 * One documented campaign. The date and the named source are part of the card,
 * not a footnote: a campaign is something somebody reported and published, and
 * a jury's first question about any of these is "says who".
 *
 * The sample message is quoted as text. A link inside it is never made
 * clickable — tapping it is the exact thing this card warns about. The only
 * link on the card is the source, which is a news outlet or a body's own site.
 */
export function CampaignCard({
  campaign,
  onCheckSample,
}: {
  campaign: Campaign;
  /** Sends the quoted message into Scan so the engine reads it live. */
  onCheckSample: (text: string) => void;
}) {
  const { t, lang } = useI18n();
  const date = campaignDate(campaign.date, lang);

  return (
    <Card className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="danger">{t(`channel.${campaign.channel}` as TextKey)}</Tag>
        <span className="t-meta text-ink-2">
          <bdi>{date}</bdi>
        </span>
      </div>

      <h3 dir="auto" className="t-row">{campaign.title}</h3>
      {campaign.summary && (
        <p dir="auto" className="t-sub">
          {campaign.summary}
        </p>
      )}

      {campaign.domain && (
        <p className="t-meta flex flex-wrap items-baseline gap-x-2 gap-y-1 text-ink-2">
          {t("camp.domain")}
          <bdi dir="ltr" className="break-all font-semibold text-red-ink">
            {campaign.domain}
          </bdi>
          {campaign.officialDomain && (
            <bdi dir="ltr" className="break-all">
              ({campaign.officialDomain})
            </bdi>
          )}
        </p>
      )}

      {/* The specimen stays in the language it arrived in — translating a
          quoted scam message would misrepresent the thing being quoted, and
          this text is also what gets pasted into the scanner. In English the
          translation sits under it, labelled, rather than in its place. */}
      {campaign.sample && (
        <div className="rounded-btn bg-field p-3">
          <p dir="auto" className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">
            {campaign.sample}
          </p>
          {campaign.sampleTranslation && (
            <p className="mt-2 border-t border-line pt-2 text-[13px] leading-relaxed text-ink-2">
              <span className="font-bold">{t("camp.translated")}</span> {campaign.sampleTranslation}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
        <span dir="auto" className="t-meta min-w-0 flex-1 text-ink-2">
          {campaign.sourceUrl ? (
            <a
              href={campaign.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 underline underline-offset-2"
            >
              {campaign.sourceName}
              <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
            </a>
          ) : (
            campaign.sourceName
          )}
        </span>

        {campaign.sample && (
          <button
            type="button"
            onClick={() => onCheckSample(campaign.sample!)}
            className="tap flex shrink-0 items-center gap-1.5 text-[13px] font-bold text-ink"
          >
            <ScanLine size={15} strokeWidth={1.75} aria-hidden="true" />
            {t("camp.scan_sample")}
          </button>
        )}
      </div>
    </Card>
  );
}
