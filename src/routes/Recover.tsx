import { useState } from "react";
import { Fingerprint, KeyRound, Smartphone, UserX, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { Card, Header, Page, PrimaryButton, SectionLabel } from "../components/Shell";
import { useI18n } from "../i18n";
import { plans, type Plan, type PlanId } from "../lib/plans";
import type { Route } from "../lib/router";

const ICONS: Record<PlanId, LucideIcon> = {
  money_lost: Wallet,
  account_hacked: KeyRound,
  data_stolen: Fingerprint,
  device_compromised: Smartphone,
  identity_theft: UserX,
};

export function Recover({ navigate }: { navigate: (route: Route) => void }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<Plan | null>(null);

  if (open) {
    return (
      <>
        <Page>
          <Header title={t("recover.title")} />
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="tap mt-1 self-start text-[15px] text-text-2"
          >
            {t("shield.back")}
          </button>

          <h2 className="mt-4 text-[22px] font-semibold">{open.title}</h2>

          <div className="mt-6">
            <SectionLabel>{t("shield.steps_label")}</SectionLabel>
          </div>
          <ol className="mt-3 space-y-3">
            {open.steps.map((step, index) => (
              <Card key={step.id} className="flex gap-3 p-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary">
                  <bdi>{index + 1}</bdi>
                </span>
                <span className="flex-1">
                  <span className="block font-semibold leading-snug">{step.title}</span>
                  <span className="mt-1 block text-[14px] leading-snug text-text-2">
                    {step.body}
                  </span>
                </span>
              </Card>
            ))}
          </ol>

          <div className="mt-6">
            <PrimaryButton onClick={() => navigate("report")}>{t("report.title")}</PrimaryButton>
          </div>
        </Page>
        <BottomNav active="recover" navigate={navigate} />
      </>
    );
  }

  return (
    <>
      <Page>
        <Header title={t("recover.title")} />
        <div className="mt-4">
          <SectionLabel>{t("recover.what")}</SectionLabel>
        </div>
        <div className="mt-3 space-y-3">
          {plans(lang).map((plan) => {
            const Icon = ICONS[plan.id];
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setOpen(plan)}
                className="flex w-full items-center gap-3 rounded-card border border-line bg-card p-4 text-start"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold leading-snug">{plan.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-text-2">
                    {plan.summary}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Page>
      <BottomNav active="recover" navigate={navigate} />
    </>
  );
}
