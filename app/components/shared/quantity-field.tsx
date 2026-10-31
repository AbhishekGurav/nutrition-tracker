import type { Key } from "react-aria-components"

import type { Serving } from "~/domain/schemas"
import { round } from "~/domain/units"
import { cn } from "~/lib/utils"
import { NumberField } from "~/components/shared/number-field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"

export interface Quantity {
  grams: number
  /** Set when the amount was entered as a number of servings. */
  servingLabel?: string
}

interface QuantityFieldProps {
  value: Quantity
  onChange: (value: Quantity) => void
  servings: readonly Serving[]
  label?: string
  className?: string
}

const GRAMS = "__grams__"

/**
 * Amount + unit picker: grams, or a count of any of the food's servings.
 * Always reports the resulting grams so callers only deal with one unit.
 */
export function QuantityField({ value, onChange, servings, label = "Amount", className }: QuantityFieldProps) {
  const serving = value.servingLabel
    ? servings.find((s) => s.label === value.servingLabel)
    : undefined
  const amount = serving ? round(value.grams / serving.grams, 2) : round(value.grams, 1)

  const setUnit = (key: Key | null) => {
    const next = servings.find((s) => s.label === key)
    if (!next) {
      onChange({ grams: value.grams })
      return
    }
    // Switching unit keeps "1 serving" as the sensible default.
    onChange({ grams: next.grams, servingLabel: next.label })
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-2">
        <NumberField
          label={label}
          value={amount}
          onChange={(v) => {
            const n = v ?? 0
            onChange(serving ? { grams: n * serving.grams, servingLabel: serving.label } : { grams: n })
          }}
          increment={serving ? 0.5 : 10}
          decimals={serving ? 2 : 1}
          max={serving ? 100 : 10000}
        />
        <Select
          value={serving?.label ?? GRAMS}
          onChange={setUnit}
          className="w-full"
          aria-label="Unit"
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem id={GRAMS} textValue="grams">grams</SelectItem>
              {servings.map((s) => (
                <SelectItem key={s.label} id={s.label} textValue={s.label}>
                  {`${s.label} (${round(s.grams, 1)}g)`}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      {serving ? (
        <p className="text-xs text-muted-foreground tabular-nums">= {round(value.grams, 1)} g</p>
      ) : null}
    </div>
  )
}
