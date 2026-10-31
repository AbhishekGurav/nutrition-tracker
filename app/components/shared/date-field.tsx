import * as React from "react"

import { cn } from "~/lib/utils"
import { isDateKey, type DateKey } from "~/domain/dates"
import { FieldDescription } from "~/components/ui/field"
import { Label } from "~/components/ui/label"

interface DateFieldProps {
  label: React.ReactNode
  value: DateKey | undefined
  onChange: (value: DateKey | undefined) => void
  min?: DateKey
  max?: DateKey
  description?: React.ReactNode
  className?: string
}

/** Native date picker (best on phones), labelled like other fields. Empty means "no date". */
export function DateField({ label, value, onChange, min, max, description, className }: DateFieldProps) {
  const id = React.useId()
  const descId = `${id}-desc`
  return (
    <div data-slot="field" className={cn("flex w-full flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="date"
        value={value ?? ""}
        min={min}
        max={max}
        aria-describedby={description ? descId : undefined}
        onChange={(e) => onChange(isDateKey(e.target.value) ? e.target.value : undefined)}
        className="h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 pointer-coarse:h-10 pointer-coarse:px-3 pointer-fine:md:text-xs dark:bg-input/30"
      />
      {description ? <FieldDescription id={descId}>{description}</FieldDescription> : null}
    </div>
  )
}
