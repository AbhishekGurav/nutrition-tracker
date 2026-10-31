import * as React from "react"
import { Radio } from "react-aria-components"

import { cn } from "~/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group"
import { RadioGroup } from "~/components/ui/radio-group"
import { FieldLabel } from "~/components/ui/field"

export interface ChoiceOption<T extends string> {
  value: T
  label: React.ReactNode
  hint?: React.ReactNode
  /** Plain-text label for accessibility when `label` isn't a string. */
  textValue?: string
}

interface ChoiceGroupProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: readonly ChoiceOption<T>[]
  "aria-label": string
  className?: string
  /** Stretch items to fill the row (segmented-control look). */
  fill?: boolean
  size?: "sm" | "default" | "lg"
}

/** Segmented single-choice control for 2–7 short options. */
export function ChoiceGroup<T extends string>({
  value,
  onChange,
  options,
  className,
  fill = true,
  size = "default",
  ...aria
}: ChoiceGroupProps<T>) {
  return (
    <ToggleGroup
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={new Set([value])}
      onSelectionChange={(keys) => {
        const next = [...keys][0]
        const match = options.find((o) => o.value === next)
        if (match) onChange(match.value)
      }}
      variant="outline"
      size={size}
      spacing={0}
      aria-label={aria["aria-label"]}
      className={cn(fill && "w-full", className)}
    >
      {options.map((o) => (
        <ToggleGroupItem
          key={o.value}
          id={o.value}
          aria-label={o.textValue}
          className={cn(fill && "flex-1", "data-selected:bg-primary data-selected:text-primary-foreground")}
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

interface ChoiceCardsProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: readonly ChoiceOption<T>[]
  label: React.ReactNode
  className?: string
}

/** Radio cards for options that need a hint line (activity level, goal). */
export function ChoiceCards<T extends string>({ value, onChange, options, label, className }: ChoiceCardsProps<T>) {
  return (
    <RadioGroup
      value={value}
      onChange={(v) => {
        const match = options.find((o) => o.value === v)
        if (match) onChange(match.value)
      }}
      className={cn("gap-2", className)}
    >
      <FieldLabel>{label}</FieldLabel>
      {options.map((o) => (
        <Radio
          key={o.value}
          value={o.value}
          className="group/choice flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 outline-none transition-colors hover:bg-muted/50 data-focus-visible:ring-2 data-focus-visible:ring-ring/40 data-selected:border-primary data-selected:bg-primary/5 dark:data-selected:bg-primary/10"
        >
          <span
            aria-hidden="true"
            className="relative flex size-4 shrink-0 items-center justify-center rounded-full border border-input group-data-selected/choice:border-primary group-data-selected/choice:bg-primary"
          >
            <span className="hidden size-1.5 rounded-full bg-primary-foreground group-data-selected/choice:block" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-medium">{o.label}</span>
            {o.hint ? <span className="text-xs text-muted-foreground">{o.hint}</span> : null}
          </span>
        </Radio>
      ))}
    </RadioGroup>
  )
}
