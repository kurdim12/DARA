import { BottomNav } from "../components/BottomNav";
import { Header, Page } from "../components/Shell";
import { useI18n, type TextKey } from "../i18n";
import type { Route } from "../lib/router";

/**
 * Protect and Learn before their own phase builds them. The header and the
 * tile's own sub-line, and nothing else — no "coming soon", which is a label
 * that tells a jury the app is unfinished.
 */
export function Placeholder({
  navigate,
  active,
  title,
  sub,
}: {
  navigate: (route: Route) => void;
  active: Route;
  title: TextKey;
  sub: TextKey;
}) {
  const { t } = useI18n();

  return (
    <>
      <Page>
        <Header title={t(title)} />
        <p className="mt-4 text-text-2">{t(sub)}</p>
      </Page>
      <BottomNav active={active} navigate={navigate} />
    </>
  );
}
