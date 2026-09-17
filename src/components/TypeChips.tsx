import { Briefcase, Link2, MessageSquare, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ANALYSIS_TYPES, type AnalysisType } from "../../shared/types";
import { Chip, ChipRow, ChipWrap } from "./Shell";
import { useI18n, type TextKey } from "../i18n";

/**
 * What each kind of thing is called on its chip, what the field above it says,
 * what the field asks for, and its icon.
 *
 * `field` and `placeholder` are the reason this table exists: the field used
 * to render one static label and one static placeholder no matter which chip
 * was lit, so the chips looked decorative. Everything a type changes is here,
 * which is also what makes it testable.
 */
export const TYPE_META: Record<
  AnalysisType,
  { label: TextKey; field: TextKey; placeholder: TextKey; Icon: LucideIcon }
> = {
  message: {
    label: "type.message",
    field: "scan.label_message",
    placeholder: "scan.ph_message",
    Icon: MessageSquare,
  },
  link: {
    label: "type.link",
    field: "scan.label_link",
    placeholder: "scan.ph_link",
    Icon: Link2,
  },
  call: {
    label: "type.call",
    field: "scan.label_call",
    placeholder: "scan.ph_call",
    Icon: Phone,
  },
  job: {
    label: "type.job",
    field: "scan.label_job",
    placeholder: "scan.ph_job",
    Icon: Briefcase,
  },
};

/**
 * The four chips, above the field inside ScanInputCard on both screens.
 *
 * They wrap rather than scroll: on a 390px screen the last chip used to sit
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
