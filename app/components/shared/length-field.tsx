import { NumberField, type NumberFieldProps } from "~/components/shared/number-field"
import { useUnits } from "~/hooks/use-data"
import { CM_PER_IN, round } from "~/domain/units"
import type { UnitSystem } from "~/domain/schemas"

type LengthFieldProps = Omit<NumberFieldProps, "value" | "onChange" | "unit" | "decimals" | "increment"> & {
  /** Stored value, always centimetres. */
  valueCm: number | null
  onChangeCm: (cm: number | null) => void
  system?: UnitSystem
}

/** Body measurement input: shows cm or inches, always stores cm. */
export function LengthField({ valueCm, onChangeCm, system: systemProp, ...props }: LengthFieldProps) {
  const { system: userSystem } = useUnits()
  const imperial = (systemProp ?? userSystem) === "imperial"
  return (
    <NumberField
      {...props}
      value={valueCm === null ? null : round(imperial ? valueCm / CM_PER_IN : valueCm, 1)}
      onChange={(v) => onChangeCm(v === null ? null : imperial ? v * CM_PER_IN : v)}
      unit={imperial ? "in" : "cm"}
      decimals={1}
      increment={imperial ? 0.25 : 0.5}
    />
  )
}
