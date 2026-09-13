import { useState } from "react";
import { Check, Globe, Phone } from "lucide-react";
import type { AnalysisType } from "../../shared/types";
import { BottomNav } from "../components/BottomNav";
import { Card, Header, Page, SectionLabel } from "../components/Shell";
import { useI18n } from "../i18n";
import { checklist } from "../lib/plans";
import type { Route } from "../lib/router";

export function Protect({
  navigate,
  onCheck,
}: {
  navigate: (route: Route) => void;
  /** Hands the value to Scan with the right chip already chosen. */
  onCheck: (text: string, type: AnalysisType) => void;
}) {
  const { t, lang } = useI18n();
  // This visit only. Nothing is written to the device and nothing is sent.
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  const items = checklist(lang);
  const done = items.filter((item) => ticked[item.id]).length;

  return (
    <>
      <Page>
        <Header title={t("tool.protect")} />
        <p className="mt-1 text-text-2">{t("tool.protect_sub")}</p>

        <div className="mt-6 space-y-3">
          <CheckField
            icon={<Phone size={20} aria-hidden="true" />}
            label={t("protect.check_sender")}
            placeholder={t("protect.check_sender_ph")}
            cta={t("protect.check_cta")}
            onSubmit={(value) => onCheck(value, "call")}
          />
          <CheckField
            icon={<Globe size={20} aria-hidden="true" />}
            label={t("protect.check_website")}
            placeholder={t("protect.check_website_ph")}
            cta={t("protect.check_cta")}
            onSubmit={(value) => onCheck(value, "website")}
          />
        </div>

        <div className="mt-9 flex items-baseline justify-between gap-3">
          <SectionLabel>{t("protect.checklist")}</SectionLabel>
          <span className="shrink-0 text-[13px] text-text-2">
            <bdi>
              {done} / {items.length}
            </bdi>{" "}
            {t("protect.completed")}
          </span>
        </div>

        <Card className="mt-3 divide-y divide-line">
          {items.map((item) => {
            const on = Boolean(ticked[item.id]);
            return (
              <button
                key={item.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => setTicked((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                className="flex w-full gap-3 p-4 text-start"
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-2 ${
                    on ? "border-primary bg-primary text-white" : "border-line"
                  }`}
                >
                  {on && <Check size={14} strokeWidth={3} />}
                </span>
                <span className="flex-1">
                  <span
                    className={`block font-medium leading-snug ${on ? "text-text-2 line-through" : ""}`}
                  >
                    {item.title}
                  </span>
                  <span className="mt-1 block text-[13px] leading-snug text-text-2">
                    {item.body}
                  </span>
                </span>
              </button>
            );
          })}
        </Card>

        <p className="mt-3 text-[13px] text-text-2">{t("protect.session_note")}</p>
      </Page>
      <BottomNav active="home" navigate={navigate} />
    </>
  );
}

function CheckField({
  icon,
  label,
  placeholder,
  cta,
  onSubmit,
}: {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  cta: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 font-semibold">
        <span className="text-primary">{icon}</span>
        {label}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="min-h-11 flex-1 rounded-full border border-line bg-bg px-4 text-[15px] outline-none placeholder:text-text-2"
        />
        <button
          type="button"
          disabled={value.trim().length === 0}
          onClick={() => onSubmit(value.trim())}
          className={`min-h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold text-white ${
            value.trim().length === 0 ? "bg-primary-soft" : "bg-primary"
          }`}
        >
          {cta}
        </button>
      </div>
    </Card>
  );
}
