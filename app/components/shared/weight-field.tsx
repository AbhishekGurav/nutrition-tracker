import { NumberField, type NumberFieldProps } from "~/components/shared/number-field"
import { useUnits } from "~/hooks/use-data"
import {
  fromDisplayWeight,
  plateIncrement,
  toDisplayWeight,
  type WeightUnit,
} from "~/domain/units"

type WeightFieldProps = Omit<
  NumberFieldProps,
  "value" | "onChange" | "unit" | "decimals" | "increment"
> & {
  /** Stored value, always kilograms. */
  valueKg: number | null
  onChangeKg: (kg: number | null) => void
  /** Overrides the user's unit setting (mainly for tests). */
  unit?: WeightUnit
  /** Stepper increment in display units; defaults to the smallest plate jump. */
  increment?: number
  hideUnit?: boolean
}

/** Weight input that shows the user's unit but always stores kg. */
export function WeightField({
  valueKg,
  onChangeKg,
  unit: unitProp,
  increment,
  hideUnit,
  ...props
}: WeightFieldProps) {
  const { weightUnit } = useUnits()
  const unit = unitProp ?? weightUnit
  return (
    <NumberField
      {...props}
      value={valueKg === null ? null : toDisplayWeight(valueKg, unit)}
      onChange={(v) => onChangeKg(v === null ? null : fromDisplayWeight(v, unit))}
      unit={hideUnit ? undefined : unit}
      decimals={unit === "lb" ? 1 : 2}
      increment={increment ?? plateIncrement(unit)}
    />
  )
}
