import { useI18n } from "../i18n";
import { pick, type Threat } from "../lib/threats";

/**
 * One known threat. The tag says how it arrives; beside it, either the live
 * count of reports filed on DARA' for that category or, when nobody has
 * reported one yet, the words "Known pattern" — never a number without a row
 * behind it.
 */
export function ThreatRow({ threat, count }: { threat: Threat; count: number }) {
  const { t, lang } = useI18n();

  return (
    <article className="border-s-[3px] border-s-danger px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex h-[22px] items-center rounded-full bg-danger-soft px-2 text-[11px] font-bold uppercase tracking-[0.04em] text-danger">
          {t(`tag.${threat.channel}` as "tag.sms")}
        </span>
        <span className="text-[13px] text-text-2">
          {count > 0 ? (
            <>
              <bdi>{count}</bdi>{" "}
              {t(count === 1 ? "threats.report_suffix" : "threats.reports_suffix")}
            </>
          ) : (
            t("threats.pattern")
          )}
        </span>
      </div>

      <h3 className="mt-1.5 text-[16px] font-semibold leading-snug">{pick(threat.title, lang)}</h3>
      <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-text-2">
        {pick(threat.description, lang)}
      </p>
    </article>
  );
}
