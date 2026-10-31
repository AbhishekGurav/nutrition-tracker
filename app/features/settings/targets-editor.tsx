import { HugeiconsIcon } from "@hugeicons/react"
import { RefreshIcon } from "@hugeicons/core-free-icons"

import { cn } from "~/lib/utils"
import type { DayType, MacroKey, Targets } from "~/domain/schemas"
import { MACRO_KEYS } from "~/domain/schemas"
import { checkKcal } from "~/domain/macros"
import {
  clearOverride,
  overrideTarget,
  type CalculatedTargets,
} from "~/domain/tdee"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { FieldDescription, FieldSet, FieldLegend } from "~/components/ui/field"
import { NumberField } from "~/components/shared/number-field"
import { MACRO_META } from "~/components/shared/macro-meta"

export type TargetValues = Pick<Targets, "training" | "rest" | "overrides">

interface TargetsEditorProps {
  value: TargetValues
  calculated: Pick<CalculatedTargets, "training" | "rest">
  onChange: (next: TargetValues) => void
}

const DAY_LABELS: Record<DayType, string> = {
  training: "Training day",
  rest: "Rest day",
}

/**
 * Two columns of target inputs. Editing a field marks it as custom so
 * recalculation won't overwrite it; the reset button restores the estimate.
 */
export function TargetsEditor({
  value,
  calculated,
  onChange,
}: TargetsEditorProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {(["training", "rest"] as const).map((day) => {
        const check = checkKcal(value[day])
        return (
          <FieldSet key={day} className="gap-3">
            <FieldLegend>{DAY_LABELS[day]}</FieldLegend>
            {MACRO_KEYS.map((key: MacroKey) => {
              const meta = MACRO_META[key]
              const overridden = !!value.overrides[day][key]
              return (
                <div key={key} className="flex items-end gap-2">
                  <NumberField
                    className="flex-1"
                    label={
                      <span className="flex items-center gap-2">
                        <span
                          className={cn("size-2 rounded-full", meta.bg)}
                          aria-hidden="true"
                        />
                        {meta.label}
                        {overridden ? (
                          <Badge variant="secondary">Custom</Badge>
                        ) : null}
                      </span>
                    }
                    unit={meta.unit}
                    value={value[day][key]}
                    onChange={(v) =>
                      v !== null && onChange(overrideTarget(value, day, key, v))
                    }
                    increment={key === "kcal" ? 50 : 5}
                    max={key === "kcal" ? 10000 : 1000}
                    decimals={0}
                  />
                  {overridden ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Reset ${meta.label.toLowerCase()} to the estimate (${calculated[day][key]})`}
                      onPress={() =>
                        onChange(clearOverride(value, calculated, day, key))
                      }
                    >
                      <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} />
                    </Button>
                  ) : null}
                </div>
              )
            })}
            {check.isMismatch ? (
              <FieldDescription className="text-destructive">
                Macros add up to {Math.round(check.expected)} kcal, not{" "}
                {value[day].kcal}.
              </FieldDescription>
            ) : null}
          </FieldSet>
        )
      })}
    </div>
  )
}
