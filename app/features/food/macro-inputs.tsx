import type { Macros } from "~/domain/schemas"
import { checkKcal } from "~/domain/macros"
import { round } from "~/domain/units"
import { Button } from "~/components/ui/button"
import { FieldDescription } from "~/components/ui/field"
import { NumberField } from "~/components/shared/number-field"
import { MACRO_META } from "~/components/shared/macro-meta"

export type MacroDraft = Record<keyof Macros, number | null>

export const emptyMacroDraft = (): MacroDraft => ({ kcal: null, protein: null, carbs: null, fat: null })

export const toMacroDraft = (m: Macros, decimals = 1): MacroDraft => ({
  kcal: round(m.kcal, 0),
  protein: round(m.protein, decimals),
  carbs: round(m.carbs, decimals),
  fat: round(m.fat, decimals),
})

/** Blank macros count as 0; blank kcal is derived from 4/4/9. */
export function resolveMacroDraft(d: MacroDraft): Macros {
  const protein = d.protein ?? 0
  const carbs = d.carbs ?? 0
  const fat = d.fat ?? 0
  const kcal = d.kcal ?? Math.round(protein * 4 + carbs * 4 + fat * 9)
  return { kcal, protein, carbs, fat }
}

export const isMacroDraftEmpty = (d: MacroDraft) => Object.values(d).every((v) => v === null || v === 0)

interface MacroInputsProps {
  value: MacroDraft
  onChange: (value: MacroDraft) => void
  /** Shown in the description, e.g. "per 100 g". */
  basis?: string
}

/** kcal + P/C/F inputs with a 4/4/9 consistency check. */
export function MacroInputs({ value, onChange, basis }: MacroInputsProps) {
  const resolved = resolveMacroDraft(value)
  const check = checkKcal(resolved)
  const set = (key: keyof Macros) => (v: number | null) => onChange({ ...value, [key]: v })

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {(["kcal", "protein", "carbs", "fat"] as const).map((key) => (
          <NumberField
            key={key}
            label={MACRO_META[key].label}
            unit={MACRO_META[key].unit}
            value={value[key]}
            onChange={set(key)}
            placeholder={key === "kcal" ? String(Math.round(resolved.kcal)) : "0"}
            showSteppers={false}
            decimals={key === "kcal" ? 0 : 1}
            max={key === "kcal" ? 5000 : 1000}
          />
        ))}
      </div>
      {basis ? <FieldDescription>Values {basis}. Leave calories blank to calculate them.</FieldDescription> : null}
      {value.kcal !== null && check.isMismatch ? (
        <div role="status" className="flex flex-wrap items-center gap-2 text-xs text-destructive">
          <span>
            Macros add up to about {Math.round(check.expected)} kcal, not {Math.round(resolved.kcal)}.
          </span>
          <Button variant="outline" size="sm" onPress={() => onChange({ ...value, kcal: Math.round(check.expected) })}>
            Use {Math.round(check.expected)}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
