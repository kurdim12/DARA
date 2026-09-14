import { Briefcase, Globe, Link2, MessageSquare, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ANALYSIS_TYPES, type AnalysisType } from "../../shared/types";
import { Chip, ChipRow } from "./Shell";
import { useI18n, type TextKey } from "../i18n";

/** What each kind of thing is called, what it asks for, and its icon. */
export const TYPE_META: Record<
  AnalysisType,
  { label: TextKey; placeholder: TextKey; Icon: LucideIcon }
> = {
  message: { label: "type.message", placeholder: "scan.ph_message", Icon: MessageSquare },
  link: { label: "type.link", placeholder: "scan.ph_link", Icon: Link2 },
  call: { label: "type.call", placeholder: "scan.ph_call", Icon: Phone },
  job: { label: "type.job", placeholder: "scan.ph_job", Icon: Briefcase },
  website: { label: "type.website", placeholder: "scan.ph_website", Icon: Globe },
};

/** The five chips. Home carries them inside the scanner card, Scan above it. */
export function TypeChips({
  value,
  onChange,
}: {
  value: AnalysisType;
  onChange: (type: AnalysisType) => void;
}) {
  const { t } = useI18n();
  return (
    <ChipRow>
      {ANALYSIS_TYPES.map((option) => (
        <Chip
          key={option}
          Icon={TYPE_META[option].Icon}
          label={t(TYPE_META[option].label)}
          selected={option === value}
          onClick={() => onChange(option)}
        />
      ))}
    </ChipRow>
  );
}
