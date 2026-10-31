import * as React from "react"

import { FieldGroup } from "~/components/ui/field"
import { TextField } from "~/components/shared/text-field"
import { scaleMacros } from "~/domain/macros"
import { MacroSuggestions } from "~/features/food/macro-suggestions"
import {
  emptyMacroDraft,
  isMacroDraftEmpty,
  MacroInputs,
  resolveMacroDraft,
  toMacroDraft,
  type MacroDraft,
} from "~/features/food/macro-inputs"
import type { QuickAddInput } from "~/features/food/food-logging"

interface QuickAddFormProps {
  id: string
  initial?: QuickAddInput
  /** Prefill only the description (e.g. carried over from a search). */
  initialName?: string
  onSubmit: (input: QuickAddInput) => void
}

/**
 * Log raw macros without a saved food. Typing a description like
 * "oats 80g" and pressing Suggest fills the numbers.
 */
export function QuickAddForm({ id, initial, initialName, onSubmit }: QuickAddFormProps) {
  const [name, setName] = React.useState(initial?.name ?? initialName ?? "")
  const [grams, setGrams] = React.useState<number | undefined>(initial?.grams || undefined)
  const [macros, setMacros] = React.useState<MacroDraft>(() =>
    initial ? toMacroDraft(initial.macros) : emptyMacroDraft()
  )
  const [error, setError] = React.useState<string>()

  return (
    <form
      id={id}
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (isMacroDraftEmpty(macros)) {
          setError("Enter at least one value.")
          return
        }
        onSubmit({ name, macros: resolveMacroDraft(macros), grams })
      }}
    >
      <FieldGroup>
        <TextField
          label="What did you eat?"
          value={name}
          onChange={setName}
          placeholder='e.g. "oats 80g" or "2 eggs"'
          description="Optional. Add an amount and use Suggest to fill the numbers."
          autoFocus
        />
        <MacroSuggestions
          query={name}
          onPick={(s) => {
            const g = s.grams ?? 100
            setName(s.servingLabel ? `${s.name} (${s.servingLabel})` : `${s.name}, ${Math.round(g)} g`)
            setGrams(g)
            setMacros(toMacroDraft(scaleMacros(s.per100g, g)))
            setError(undefined)
          }}
        />
        <MacroInputs value={macros} onChange={(m) => (setMacros(m), setError(undefined))} basis="for this entry" />
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </FieldGroup>
    </form>
  )
}
