import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { MinusSignIcon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { NumberField as NumberFieldPrimitive } from "react-aria-components"

import { cn } from "~/lib/utils"
import { round } from "~/domain/units"
import { FieldDescription, FieldError, FieldLabel } from "~/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "~/components/ui/input-group"

export interface NumberFieldProps {
  value: number | null
  onChange: (value: number | null) => void
  label?: React.ReactNode
  /** Required when no visible label is given. */
  "aria-label"?: string
  description?: React.ReactNode
  error?: string
  /** Amount the +/- buttons change the value by. Typed values aren't snapped. */
  increment?: number
  min?: number
  max?: number
  decimals?: number
  unit?: string
  showSteppers?: boolean
  isDisabled?: boolean
  placeholder?: string
  className?: string
  inputClassName?: string
  autoFocus?: boolean
  name?: string
}

/**
 * Numeric input with a decimal keypad on mobile and optional +/- steppers.
 * Built on react-aria's NumberField, so the value commits on blur/Enter and
 * partially typed numbers ("10.") are never clobbered by re-renders.
 */
export function NumberField({
  value,
  onChange,
  label,
  description,
  error,
  increment = 1,
  min = 0,
  max,
  decimals = 1,
  unit,
  showSteppers = true,
  isDisabled,
  placeholder,
  className,
  inputClassName,
  autoFocus,
  name,
  ...aria
}: NumberFieldProps) {
  const clamp = (v: number) => {
    let out = v
    if (min !== undefined) out = Math.max(min, out)
    if (max !== undefined) out = Math.min(max, out)
    return round(out, decimals)
  }
  const step = (dir: 1 | -1) => onChange(clamp((value ?? 0) + dir * increment))
  const atMin = value !== null && min !== undefined && value <= min
  const atMax = value !== null && max !== undefined && value >= max

  return (
    <NumberFieldPrimitive
      value={value ?? Number.NaN}
      onChange={(v) => onChange(Number.isNaN(v) ? null : clamp(v))}
      minValue={min}
      maxValue={max}
      isDisabled={isDisabled}
      isInvalid={!!error}
      formatOptions={{ maximumFractionDigits: decimals, useGrouping: false }}
      aria-label={aria["aria-label"]}
      name={name}
      className={cn("group/field flex min-w-0 flex-col gap-2", className)}
      data-slot="field"
      data-invalid={error ? true : undefined}
    >
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <InputGroup>
        {showSteppers ? (
          <InputGroupAddon>
            <InputGroupButton
              slot={null}
              size="icon-sm"
              aria-label="Decrease"
              isDisabled={isDisabled || atMin}
              onPress={() => step(-1)}
              excludeFromTabOrder
            >
              <HugeiconsIcon icon={MinusSignIcon} strokeWidth={2} />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
        <InputGroupInput
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn("text-center tabular-nums", inputClassName)}
        />
        {unit ? (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{unit}</InputGroupText>
          </InputGroupAddon>
        ) : null}
        {showSteppers ? (
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              slot={null}
              size="icon-sm"
              aria-label="Increase"
              isDisabled={isDisabled || atMax}
              onPress={() => step(1)}
              excludeFromTabOrder
            >
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </NumberFieldPrimitive>
  )
}
