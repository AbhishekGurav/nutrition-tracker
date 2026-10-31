import * as React from "react"
import { Checkbox as CheckboxPrimitive, CheckboxGroup } from "react-aria-components"

import type { Exercise, MuscleGroup, NewEntity } from "~/domain/schemas"
import { MUSCLE_GROUPS } from "~/domain/schemas"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"

import { FieldGroup, FieldLabel } from "~/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { TextField } from "~/components/shared/text-field"
import { EQUIPMENT_OPTIONS, MUSCLE_LABELS, MUSCLE_OPTIONS } from "~/features/workouts/workout-meta"

export type ExerciseDraft = NewEntity<Exercise>

export const emptyExercise = (name = ""): ExerciseDraft => ({
  name,
  primaryMuscle: "chest",
  secondaryMuscles: [],
  equipment: "barbell",
  source: "user",
})

interface ExerciseFormProps {
  id: string
  initial: ExerciseDraft
  onSubmit: (draft: ExerciseDraft) => void
}

export function ExerciseForm({ id, initial, onSubmit }: ExerciseFormProps) {
  const [draft, setDraft] = React.useState(initial)
  const [error, setError] = React.useState<string>()
  const patch = (p: Partial<ExerciseDraft>) => setDraft((d) => ({ ...d, ...p }))

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        if (!draft.name.trim()) return setError("Name the exercise.")
        onSubmit({
          ...draft,
          name: draft.name.trim(),
          secondaryMuscles: draft.secondaryMuscles.filter((m) => m !== draft.primaryMuscle),
        })
      }}
    >
      <FieldGroup>
        <TextField
          label="Name"
          value={draft.name}
          onChange={(name) => (patch({ name }), setError(undefined))}
          placeholder="e.g. Paused bench press"
          error={error}
          autoFocus
          isRequired
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={draft.primaryMuscle}
            onChange={(k) => {
              const m = MUSCLE_OPTIONS.find((o) => o.value === k)
              if (m) patch({ primaryMuscle: m.value })
            }}
            className="flex w-full flex-col gap-2"
          >
            <FieldLabel>Main muscle</FieldLabel>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {MUSCLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} id={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={draft.equipment}
            onChange={(k) => {
              const eq = EQUIPMENT_OPTIONS.find((o) => o.value === k)
              if (eq) patch({ equipment: eq.value })
            }}
            className="flex w-full flex-col gap-2"
          >
            <FieldLabel>Equipment</FieldLabel>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {EQUIPMENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} id={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <CheckboxGroup
          value={draft.secondaryMuscles}
          onChange={(values) =>
            patch({ secondaryMuscles: MUSCLE_GROUPS.filter((m) => values.includes(m)) })
          }
          className="flex flex-col gap-2"
        >
          <FieldLabel>Also works (optional)</FieldLabel>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {MUSCLE_GROUPS.filter((m: MuscleGroup) => m !== draft.primaryMuscle).map((m) => (
              <CheckboxPrimitive
                key={m}
                value={m}
                className="group/cb flex min-h-10 cursor-pointer items-center gap-2 rounded-md text-sm outline-none data-focus-visible:ring-2 data-focus-visible:ring-ring/40"
              >
                <span
                  aria-hidden="true"
                  className="flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input text-primary-foreground group-data-selected/cb:border-primary group-data-selected/cb:bg-primary"
                >
                  <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} className="hidden size-3 group-data-selected/cb:block" />
                </span>
                {MUSCLE_LABELS[m]}
              </CheckboxPrimitive>
            ))}
          </div>
        </CheckboxGroup>
      </FieldGroup>
    </form>
  )
}
