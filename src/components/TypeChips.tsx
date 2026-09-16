import { Briefcase, Globe, Link2, MessageSquare, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ANALYSIS_TYPES, type AnalysisType } from "../../shared/types";
import { Chip, ChipRow, ChipWrap } from "./Shell";
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

/**
 * The five chips, above the field inside ScanInputCard on both screens.
 *
 * They wrap rather than scroll: on a 390px screen the fifth chip used to sit
 * half past the edge with nothing to say it was there. `wrap={false}` keeps
 * the old scrolling rail for anywhere that still wants it.
 */
export function TypeChips({
  value,
  onChange,
  wrap = true,
}: {
  value: AnalysisType;
  onChange: (type: AnalysisType) => void;
  wrap?: boolean;
}) {
  const { t } = useI18n();
  const Row = wrap ? ChipWrap : ChipRow;
  return (
    <Row>
      {ANALYSIS_TYPES.map((option) => (
        <Chip
          key={option}
          Icon={TYPE_META[option].Icon}
          label={t(TYPE_META[option].label)}
          selected={option === value}
          onClick={() => onChange(option)}
        />
      ))}
    </Row>
  );
}
