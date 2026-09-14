import { Tag } from "./Shell";
import { useI18n } from "../i18n";
import { pick, type Threat } from "../lib/threats";

/**
 * One known threat. The tag says how it arrives; beside it, either the live
 * count of reports filed on DARA' for that category or, when nobody has
 * reported one yet, the words "Known pattern" — never a number without a row
 * behind it.
 */
export function ThreatRow({
  threat,
  count,
  level = 3,
}: {
  threat: Threat;
  count: number;
  /** 3 under Home's section heading, 2 on the full-list screen. */
  level?: 2 | 3;
}) {
  const { t, lang } = useI18n();
  const Title = level === 2 ? "h2" : "h3";

  return (
    <article className="relative px-4 py-3.5 ps-5">
      {/* The leading bar is inset rather than full-bleed, so a list of these
          reads as rows of one card and not as three separate cards. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-3.5 start-0 w-[3px] rounded-e-full bg-red"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="danger">{t(`tag.${threat.channel}` as "tag.sms")}</Tag>
        <span className="t-meta text-slate">
          {count > 0 ? (
            <>
              <bdi className="tnum">{count}</bdi>{" "}
              {t(count === 1 ? "threats.report_suffix" : "threats.reports_suffix")}
            </>
          ) : (
            t("threats.pattern")
          )}
        </span>
      </div>

      <Title className="t-row mt-2">{pick(threat.title, lang)}</Title>
      <p className="t-sub mt-1 line-clamp-2">{pick(threat.description, lang)}</p>
    </article>
  );
}
