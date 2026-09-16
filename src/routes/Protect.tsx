import { useState, type ReactNode } from "react";
import { Globe, Phone } from "lucide-react";
import type { AnalysisType } from "../../shared/types";
import { BottomNav } from "../components/BottomNav";
import {
  Card,
  FieldLabel,
  Header,
  IconRow,
  ListCard,
  Page,
  Toggle,
} from "../components/Shell";
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
        <p className="t-sub -mt-1.5">{t("tool.protect_sub")}</p>

        <div className="mt-4 space-y-2.5">
          <CheckField
            icon={<Phone size={20} strokeWidth={1.75} aria-hidden="true" />}
            label={t("protect.check_sender")}
            placeholder={t("protect.check_sender_ph")}
            cta={t("protect.check_cta")}
            onSubmit={(value) => onCheck(value, "call")}
          />
          <CheckField
            icon={<Globe size={20} strokeWidth={1.75} aria-hidden="true" />}
            label={t("protect.check_website")}
            placeholder={t("protect.check_website_ph")}
            cta={t("protect.check_cta")}
            onSubmit={(value) => onCheck(value, "website")}
          />
        </div>

        <div className="mt-7 flex items-baseline justify-between gap-3">
          <FieldLabel>{t("protect.checklist")}</FieldLabel>
          <span className="t-meta shrink-0 text-ink-2">
            <bdi className="tnum">
              {done} / {items.length}
            </bdi>{" "}
            {t("protect.completed")}
          </span>
        </div>

        <ListCard className="mt-2.5">
          {items.map((item) => {
            const on = Boolean(ticked[item.id]);
            const flip = () => setTicked((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
            return (
              <IconRow
                key={item.id}
                title={
                  <span className={on ? "text-ink-2 line-through" : undefined}>{item.title}</span>
                }
                sub={item.body}
                trailing={<Toggle small on={on} onChange={flip} label={item.title} />}
              />
            );
          })}
        </ListCard>

        <p className="t-sub mt-3">{t("protect.session_note")}</p>
      </Page>
      <BottomNav active="protect" navigate={navigate} />
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
  icon: ReactNode;
  label: string;
  placeholder: string;
  cta: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const empty = value.trim().length === 0;

  return (
    <Card>
      <p className="t-row flex items-center gap-2">
        <span className="text-ink">{icon}</span>
        {label}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-11 min-w-0 flex-1 rounded-btn border border-line bg-paper px-3.5 text-[15px] font-medium text-ink outline-none placeholder:text-ink-2"
        />
        <button
          type="button"
          disabled={empty}
          onClick={() => onSubmit(value.trim())}
          className={`h-9 shrink-0 rounded-full px-4 text-[14px] font-bold ${
            empty ? "bg-line text-ink-2" : "bg-ink text-white-brush"
          }`}
        >
          {cta}
        </button>
      </div>
    </Card>
  );
}
