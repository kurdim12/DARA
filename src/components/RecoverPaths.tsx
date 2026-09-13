import v1 from "../../content/v1-content.json";
import { useI18n } from "../i18n";

/**
 * "I already interacted with something" paths.
 *
 * Every recovery entry ported from v1 carries unverified phone numbers and
 * unverified claims, and none has been approved — so in a production build
 * this renders nothing at all rather than a promise the app cannot keep. In
 * dev it lists what is waiting on Abdelrahman, with a VERIFY tag, the same way
 * unverified contacts behave elsewhere.
 *
 * Mark an entry `"verified": true` in content/v1-content.json, after checking
 * it against an official source, and it appears here.
 */
interface RecoverEntry {
  id: string;
  ar: string;
  en: string | null;
  verified?: boolean;
}

const ENTRIES: RecoverEntry[] = Object.entries(
  v1.recover_stretch as unknown as Record<string, { ar?: string; en?: string | null; verified?: boolean }>,
)
  .filter(([id, value]) => id !== "note" && typeof value?.ar === "string")
  .map(([id, value]) => ({
    id,
    ar: value.ar as string,
    en: (value.en ?? null) as string | null,
    verified: value.verified === true,
  }));

export function RecoverPaths() {
  const { t, lang } = useI18n();
  const approved = ENTRIES.filter((entry) => entry.verified);
  const pending = ENTRIES.length - approved.length;

  if (approved.length === 0) {
    if (!import.meta.env.DEV) return null;
    return (
      <section className="mt-10 border-t border-rule pt-5">
        <h2>{t("protection.recover_title")}</h2>
        <p className="mt-1 text-base text-ink-2">{t("protection.recover_sub")}</p>
        <p className="mt-3 text-sm text-ink-2">
          <span className="me-2 border border-threat px-1.5 text-xs text-threat">VERIFY</span>
          <bdi>{pending}</bdi> recovery paths are written but unverified, so this
          section is hidden in production.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-10 border-t border-rule pt-5">
      <h2>{t("protection.recover_title")}</h2>
      <p className="mt-1 text-base text-ink-2">{t("protection.recover_sub")}</p>
      <ul className="mt-4 divide-y divide-rule border-y border-rule">
        {approved.map((entry) => (
          <li key={entry.id} className="py-4">
            <p dir="auto" className="text-base leading-snug">
              {(lang === "en" ? entry.en : entry.ar) ?? entry.ar}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
