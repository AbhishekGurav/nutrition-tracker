import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons"

import type { Food, NewEntity, Serving } from "~/domain/schemas"
import { scaleMacros, toPer100g } from "~/domain/macros"
import { Button } from "~/components/ui/button"
import { FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "~/components/ui/field"
import { ChoiceGroup } from "~/components/shared/choice"
import { NumberField } from "~/components/shared/number-field"
import { TextField } from "~/components/shared/text-field"
import { MacroSuggestions } from "~/features/food/macro-suggestions"
import {
  emptyMacroDraft,
  isMacroDraftEmpty,
  MacroInputs,
  resolveMacroDraft,
  toMacroDraft,
  type MacroDraft,
} from "~/features/food/macro-inputs"

export type FoodDraft = NewEntity<Food>

type Basis = "100g" | "serving"

interface FoodFormProps {
  id: string
  initial: FoodDraft
  /** Shows "Variation of …" context and keeps the link. */
  baseName?: string
  onSubmit: (draft: FoodDraft) => void
}

interface ServingDraft {
  label: string
  grams: number | null
}

/**
 * Create or edit a food. Values can be entered per 100 g or per serving
 * (what most labels show); they're always stored per 100 g.
 */
export function FoodForm({ id, initial, baseName, onSubmit }: FoodFormProps) {
  const [name, setName] = React.useState(initial.name)
  const [brand, setBrand] = React.useState(initial.brand ?? "")
  const [basis, setBasis] = React.useState<Basis>("100g")
  const [servingGrams, setServingGrams] = React.useState<number | null>(initial.servings[0]?.grams ?? null)
  const [macros, setMacros] = React.useState<MacroDraft>(() =>
    isMacroDraftEmptyMacros(initial) ? emptyMacroDraft() : toMacroDraft(initial.per100g)
  )
  const [servings, setServings] = React.useState<ServingDraft[]>(initial.servings.map((s) => ({ ...s })))
  const [errors, setErrors] = React.useState<{ name?: string; macros?: string; serving?: string }>({})

  // Switching basis converts the numbers so nothing is lost.
  const changeBasis = (next: Basis) => {
    if (next === basis) return
    const grams = servingGrams ?? servings[0]?.grams ?? null
    if (next === "serving" && !grams) {
      setBasis(next)
      return
    }
    if (grams && !isMacroDraftEmpty(macros)) {
      const m = resolveMacroDraft(macros)
      setMacros(toMacroDraft(next === "serving" ? scaleMacros(m, grams) : toPer100g(m, grams)))
    }
    setServingGrams(grams)
    setBasis(next)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!name.trim()) next.name = "Give the food a name."
    if (isMacroDraftEmpty(macros)) next.macros = "Enter at least one value."
    if (basis === "serving" && !servingGrams) next.serving = "Enter the serving size in grams."
    setErrors(next)
    if (Object.keys(next).length) return

    const entered = resolveMacroDraft(macros)
    const per100g = basis === "serving" && servingGrams ? toPer100g(entered, servingGrams) : entered
    const cleanServings: Serving[] = servings
      .filter((s): s is { label: string; grams: number } => s.label.trim() !== "" && !!s.grams && s.grams > 0)
      .map((s) => ({ label: s.label.trim(), grams: s.grams }))
    if (basis === "serving" && servingGrams && !cleanServings.some((s) => s.grams === servingGrams)) {
      cleanServings.unshift({ label: "1 serving", grams: servingGrams })
    }
    onSubmit({
      ...initial,
      name: name.trim(),
      brand: brand.trim() || undefined,
      per100g: roundPer100g(per100g),
      servings: cleanServings,
      source: "user",
    })
  }

  return (
    <form id={id} onSubmit={submit}>
      <FieldGroup>
        {baseName ? (
          <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            Variation of <span className="font-medium text-foreground">{baseName}</span>. Adjust the values to match how you make it.
          </p>
        ) : null}
        <TextField label="Name" value={name} onChange={(v) => (setName(v), setErrors((e) => ({ ...e, name: undefined })))} error={errors.name} autoFocus isRequired />
        <TextField label="Brand (optional)" value={brand} onChange={setBrand} />

        <div className="flex flex-col gap-2">
          <FieldLabel>Values are</FieldLabel>
          <ChoiceGroup
            aria-label="Values are"
            value={basis}
            onChange={changeBasis}
            options={[
              { value: "100g", label: "Per 100 g" },
              { value: "serving", label: "Per serving" },
            ]}
          />
        </div>
        {basis === "serving" ? (
          <NumberField
            label="Serving size"
            unit="g"
            value={servingGrams}
            onChange={(v) => (setServingGrams(v), setErrors((e) => ({ ...e, serving: undefined })))}
            showSteppers={false}
            min={0.1}
            max={5000}
            error={errors.serving}
          />
        ) : null}

        <MacroSuggestions
          query={`${name} ${brand}`.trim()}
          onPick={(s) => {
            const grams = basis === "serving" && servingGrams ? servingGrams : 100
            setMacros(toMacroDraft(scaleMacros(s.per100g, grams)))
            setErrors((e) => ({ ...e, macros: undefined }))
          }}
        />
        <MacroInputs
          value={macros}
          onChange={(m) => (setMacros(m), setErrors((e) => ({ ...e, macros: undefined })))}
          basis={basis === "serving" ? "per serving" : "per 100 g"}
        />
        {errors.macros ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.macros}
          </p>
        ) : null}

        <FieldSet className="gap-2">
          <FieldLegend variant="label">Servings</FieldLegend>
          <FieldDescription>Add the portions you use, like “1 scoop” or “1 bowl”, so logging is one tap.</FieldDescription>
          {servings.map((s, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] items-end gap-2">
              <TextField
                label={<span className="sr-only">Serving {i + 1} name</span>}
                value={s.label}
                onChange={(label) => setServings((list) => list.map((x, j) => (j === i ? { ...x, label } : x)))}
                placeholder="e.g. 1 scoop"
              />
              <NumberField
                aria-label={`Serving ${i + 1} grams`}
                unit="g"
                value={s.grams}
                onChange={(grams) => setServings((list) => list.map((x, j) => (j === i ? { ...x, grams } : x)))}
                showSteppers={false}
                min={0.1}
                max={5000}
              />
              <Button variant="ghost" size="icon" aria-label={`Remove serving ${i + 1}`} onPress={() => setServings((list) => list.filter((_, j) => j !== i))}>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              </Button>
            </div>
          ))}
          <Button variant="outline" className="w-fit" onPress={() => setServings((list) => [...list, { label: "", grams: null }])}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
            Add serving
          </Button>
        </FieldSet>
      </FieldGroup>
    </form>
  )
}

function isMacroDraftEmptyMacros(d: FoodDraft) {
  const m = d.per100g
  return m.kcal === 0 && m.protein === 0 && m.carbs === 0 && m.fat === 0
}

function roundPer100g(m: Food["per100g"]): Food["per100g"] {
  const r = (n: number) => Math.round(n * 100) / 100
  return { kcal: r(m.kcal), protein: r(m.protein), carbs: r(m.carbs), fat: r(m.fat) }
}

export const emptyFoodDraft = (name = ""): FoodDraft => ({
  name,
  per100g: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  servings: [],
  source: "user",
})

/** Starting point for a variation: copy the base, link it, and mark the name. */
export function variationDraft(base: Food): FoodDraft {
  return {
    name: `${base.name} (my version)`,
    brand: base.brand,
    category: base.category,
    baseFoodId: base.id,
    per100g: { ...base.per100g },
    servings: base.servings.map((s) => ({ ...s })),
    source: "user",
  }
}
