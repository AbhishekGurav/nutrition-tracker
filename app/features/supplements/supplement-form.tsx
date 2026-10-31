import * as React from "react"

import type { NewEntity, Supplement, SupplementTiming } from "~/domain/schemas"
import { todayKey } from "~/domain/dates"
import { FieldGroup, FieldLabel } from "~/components/ui/field"
import { Switch } from "~/components/ui/switch"
import { NumberField } from "~/components/shared/number-field"
import { TextField } from "~/components/shared/text-field"
import { ChoiceCards } from "~/components/shared/choice"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { COMMON_UNITS, TIMING_OPTIONS } from "~/features/supplements/supplement-meta"

export type SupplementDraft = NewEntity<Supplement>

export const emptySupplement = (): SupplementDraft => ({
  name: "",
  dose: 5,
  unit: "g",
  timing: "morning",
  active: true,
  startDate: todayKey(),
})

interface SupplementFormProps {
  id: string
  initial: SupplementDraft
  onSubmit: (draft: SupplementDraft) => void
}

export function SupplementForm({ id, initial, onSubmit }: SupplementFormProps) {
  const [draft, setDraft] = React.useState(initial)
  const [error, setError] = React.useState<string>()
  const patch = (p: Partial<SupplementDraft>) => setDraft((d) => ({ ...d, ...p }))
  const units = COMMON_UNITS.includes(draft.unit as (typeof COMMON_UNITS)[number])
    ? [...COMMON_UNITS]
    : [...COMMON_UNITS, draft.unit]

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        if (!draft.name.trim()) return setError("Give it a name.")
        onSubmit({ ...draft, name: draft.name.trim() })
      }}
    >
      <FieldGroup>
        <TextField
          label="Name"
          value={draft.name}
          onChange={(name) => (patch({ name }), setError(undefined))}
          placeholder="e.g. Creatine monohydrate"
          error={error}
          autoFocus
          isRequired
        />
        <div className="grid grid-cols-2 items-end gap-3">
          <NumberField
            label="Dose"
            value={draft.dose}
            onChange={(v) => v !== null && v > 0 && patch({ dose: v })}
            min={0.01}
            max={100000}
            decimals={2}
            showSteppers={false}
          />
          <Select value={draft.unit} onChange={(k) => typeof k === "string" && patch({ unit: k })} className="flex w-full flex-col gap-2">
            <FieldLabel>Unit</FieldLabel>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {units.map((u) => (
                  <SelectItem key={u} id={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <ChoiceCards<SupplementTiming>
          label="When"
          value={draft.timing}
          onChange={(timing) => patch({ timing })}
          options={TIMING_OPTIONS}
        />
        <div className="flex items-center justify-between gap-3">
          <span id={`${id}-active`} className="text-sm">
            Active (counts toward your streak)
          </span>
          <Switch aria-labelledby={`${id}-active`} isSelected={draft.active} onChange={(active) => patch({ active })} />
        </div>
      </FieldGroup>
    </form>
  )
}
