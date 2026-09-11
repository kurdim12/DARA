import { useEffect, useState } from "react";
import { BottomNav } from "../components/BottomNav";
import { LangToggle, Page, PrimaryButton } from "../components/Layout";
import { useI18n } from "../i18n";
import { listCases, type StoredCase } from "../lib/storage";
import { statusLabel } from "../lib/status";
import type { Route } from "../lib/router";

type Row = StoredCase & { live?: string; failed?: boolean };

/**
 * The case numbers this device kept, with the status read back from the
 * server. There is no account behind this: nothing identifies the person, and
 * the endpoint returns a status and nothing else.
 */
export function Reports({ navigate }: { navigate: (route: Route) => void }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>(() => listCases());
  const [checking, setChecking] = useState(rows.length > 0);

  useEffect(() => {
    if (rows.length === 0) return;
    let cancelled = false;

    (async () => {
      const updated = await Promise.all(
        listCases().map(async (entry): Promise<Row> => {
          try {
            const res = await fetch(`/api/report/${encodeURIComponent(entry.case_number)}`);
            if (!res.ok) return { ...entry, failed: true };
            const body = (await res.json()) as { status?: string };
            if (typeof body.status !== "string") return { ...entry, failed: true };
            return { ...entry, live: body.status };
          } catch {
            // The number stays on screen; only the status is unknown.
            return { ...entry, failed: true };
          }
        }),
      );
      if (!cancelled) {
        setRows(updated);
        setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Runs once: the stored list does not change while this screen is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Page withNav>
        <header className="flex justify-end">
          <LangToggle />
        </header>

        <h1 className="mt-6 text-3xl font-bold">{t("reports.title")}</h1>
        <p className="mt-2 text-base text-ink-70">{t("reports.subtitle")}</p>

        {rows.length === 0 ? (
          <section className="mt-12">
            <p className="text-xl leading-snug">{t("reports.empty_title")}</p>
            <p className="mt-3 text-base text-ink-70">{t("reports.empty_sub")}</p>
            <div className="mt-8">
              <PrimaryButton onClick={() => navigate("detect")}>
                {t("reports.empty_cta")}
              </PrimaryButton>
            </div>
          </section>
        ) : (
          <>
            <ul className="mt-8 divide-y divide-ink-12 border-y border-ink-12">
              {rows.map((row) => (
                <li key={row.case_number} className="py-4">
                  <p className="text-xl font-bold tracking-tight">
                    <bdi>{row.case_number}</bdi>
                  </p>
                  {row.failed ? (
                    <p className="mt-1 text-base text-ink-70">{t("reports.error")}</p>
                  ) : row.live ? (
                    <p className="mt-1 text-base text-ink-70">
                      {statusLabel(row.live, t)}
                    </p>
                  ) : (
                    <p className="mt-1 text-base text-ink-55">
                      {checking ? t("reports.checking") : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-ink-55">{t("reports.privacy")}</p>
          </>
        )}
      </Page>
      <BottomNav active="reports" navigate={navigate} />
    </>
  );
}
