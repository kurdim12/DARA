import { useState } from "react";
import { Banknote, Fingerprint, KeyRound, Link2, ShieldAlert, Smartphone, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import {
  Header,
  IconRow,
  Page,
  PrimaryButton,
  RowChevron,
  Stepper,
} from "../components/Shell";
import { useI18n } from "../i18n";
import { plans, type Plan, type PlanId } from "../lib/plans";
import type { Route } from "../lib/router";

const ICONS: Record<PlanId, LucideIcon> = {
  money_lost: Banknote,
  data_stolen: Fingerprint,
  link_tapped: Link2,
  account_hacked: KeyRound,
  device_compromised: Smartphone,
  identity_theft: UserX,
};

export function Recover({ navigate }: { navigate: (route: Route) => void }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<Plan | null>(null);

  if (open) {
    // Every plan ends by pointing at DARA' itself. That last step is the
    // screen's action, not another paragraph to read.
    const steps = [...open.steps];
    const last = steps.at(-1)?.id === "report_dara" ? steps.pop() : undefined;

    return (
      <>
        <Page>
          <Header title={open.title} onBack={() => setOpen(null)} />

          <div className="mt-2">
            <Stepper steps={steps} firstDanger={open.id === "money_lost"} />
          </div>

          <div className="mt-6">
            <PrimaryButton onClick={() => navigate("report")}>
              {last?.title ?? t("report.title")}
            </PrimaryButton>
          </div>
        </Page>
        <BottomNav active="recover" navigate={navigate} />
      </>
    );
  }

  return (
    <>
      <Page>
        <Header title={t("rec.title")} />
        <p className="t-sub -mt-1.5">{t("rec.sub")}</p>

        <div className="mt-4 space-y-2">
          {plans(lang).map((plan) => (
            <IconRow
              key={plan.id}
              as="card"
              Icon={ICONS[plan.id]}
              title={plan.title}
              sub={plan.summary}
              trailing={<RowChevron />}
              onClick={() => setOpen(plan)}
            />
          ))}

          {/* The sixth. Being blackmailed is not a recovery plan — it opens the
              shield, which is the screen with the quick exit on it. */}
          <IconRow
            as="card"
            Icon={ShieldAlert}
            tone="red"
            title={t("rec.sit_shield")}
            sub={t("rec.sit_shield_sub")}
            trailing={<RowChevron />}
            onClick={() => navigate("shield")}
          />
        </div>
      </Page>
      <BottomNav active="recover" navigate={navigate} />
    </>
  );
}
