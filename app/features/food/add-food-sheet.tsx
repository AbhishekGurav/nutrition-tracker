import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, FlashIcon, RiceBowl01Icon } from "@hugeicons/core-free-icons"

import type { Food, FoodLogEntry, Macros, Meal, MealSlot } from "~/domain/schemas"
import { addMacros, remainingMacros, scaleMacros } from "~/domain/macros"
import type { DateKey } from "~/domain/dates"
import { useFoods, useMeals, useRecentFoodIds } from "~/hooks/use-data"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { FieldLabel } from "~/components/ui/field"
import { ResponsiveSheet } from "~/components/shared/responsive-sheet"
import { SearchList } from "~/components/shared/search-list"
import { ListRow } from "~/components/shared/list-row"
import { MacroChips } from "~/components/shared/macro-display"
import { QuantityField, type Quantity } from "~/components/shared/quantity-field"
import { ChoiceGroup } from "~/components/shared/choice"
import { FoodRow } from "~/features/food/food-row"
import { QuickAddForm } from "~/features/food/quick-add-form"
import {
  defaultQuantity,
  logFood,
  logMeal,
  mealTotals,
  quickAdd,
  SLOT_LABELS,
  SLOT_OPTIONS,
  updateEntryQuantity,
  updateQuickAdd,
  type FoodLike,
} from "~/features/food/food-logging"

type PickItem = { type: "food"; food: Food } | { type: "meal"; meal: Meal; totals: Macros }

type Mode =
  | { kind: "search" }
  | { kind: "amount"; food: FoodLike; quantity: Quantity }
  | { kind: "quick" }

export interface AddFoodSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  date: DateKey
  slot: MealSlot
  /** Edit an existing entry instead of adding. */
  entry?: FoodLogEntry
  /** Open straight into quick-add. */
  quick?: boolean
  /** Open straight into the amount step for this food. */
  food?: Food
  /** Today's remaining macros before this entry, for the live preview. */
  remaining?: Macros
}

const pickKey = (p: PickItem) => (p.type === "food" ? `f-${p.food.id}` : `m-${p.meal.id}`)
const pickText = (p: PickItem) =>
  p.type === "food" ? `${p.food.name} ${p.food.brand ?? ""} ${p.food.category ?? ""}` : `${p.meal.name} meal`

/**
 * The core logging flow: search → amount → log, plus quick-add and one-tap
 * saved meals. Also used to edit an existing entry.
 */
export function AddFoodSheet({ isOpen, onOpenChange, date, slot: initialSlot, entry, quick, food: initialFood, remaining }: AddFoodSheetProps) {
  const foods = useFoods()
  const meals = useMeals()
  const recentIds = useRecentFoodIds(25)
  const [slot, setSlot] = React.useState<MealSlot>(entry?.slot ?? initialSlot)
  const [query, setQuery] = React.useState("")
  const isQuickEntry = entry !== undefined && !entry.per100g

  const foodsById = React.useMemo(() => new Map((foods ?? []).map((f) => [f.id, f])), [foods])

  const [mode, setMode] = React.useState<Mode>(() => {
    if (quick || isQuickEntry) return { kind: "quick" }
    if (initialFood) return { kind: "amount", food: initialFood, quantity: defaultQuantity(initialFood) }
    if (entry?.per100g) {
      return {
        kind: "amount",
        food: { id: entry.foodId, name: entry.name, per100g: entry.per100g, servings: [] },
        quantity: { grams: entry.grams, servingLabel: entry.servingLabel },
      }
    }
    return { kind: "search" }
  })

  // When editing, pick up the food's servings once foods load (snapshot macros stay).
  const amountFood: FoodLike | undefined =
    mode.kind === "amount"
      ? { ...mode.food, servings: mode.food.servings.length ? mode.food.servings : (mode.food.id && foodsById.get(mode.food.id)?.servings) || [] }
      : undefined

  const items = React.useMemo<PickItem[]>(() => {
    const mealItems: PickItem[] = (meals ?? []).map((m) => ({ type: "meal", meal: m, totals: mealTotals(m, foodsById) }))
    const foodItems: PickItem[] = (foods ?? []).map((f) => ({ type: "food", food: f }))
    return [...mealItems, ...foodItems]
  }, [meals, foods, foodsById])

  const idleItems = React.useMemo<PickItem[]>(() => {
    const recent = (recentIds ?? []).flatMap((id) => {
      const f = foodsById.get(id)
      return f ? [{ type: "food", food: f } as const] : []
    })
    const mealItems: PickItem[] = (meals ?? []).map((m) => ({ type: "meal", meal: m, totals: mealTotals(m, foodsById) }))
    if (recent.length + mealItems.length > 0) return [...mealItems, ...recent]
    return (foods ?? []).filter((f) => f.source === "user").map((f) => ({ type: "food", food: f }))
  }, [recentIds, foodsById, meals, foods])

  const close = () => onOpenChange(false)
  const editing = entry !== undefined

  const submitAmount = async () => {
    if (mode.kind !== "amount" || mode.quantity.grams <= 0) return
    if (entry) {
      await updateEntryQuantity(entry, mode.quantity, slot)
      toast.success("Entry updated")
    } else {
      await logFood(mode.food, mode.quantity, date, slot)
      toast.success(`Added ${mode.food.name} to ${SLOT_LABELS[slot].toLowerCase()}`)
    }
    close()
  }

  const pickMeal = async (meal: Meal) => {
    const added = await logMeal(meal, foodsById, date, slot)
    toast.success(`Logged ${meal.name} (${added.length} items) to ${SLOT_LABELS[slot].toLowerCase()}`)
    close()
  }

  const title = editing ? "Edit entry" : mode.kind === "quick" ? "Quick add" : mode.kind === "amount" ? mode.food.name : "Add food"

  const slotPicker = (
    <div className="flex flex-col gap-2">
      <FieldLabel>Meal</FieldLabel>
      <ChoiceGroup aria-label="Meal" value={slot} onChange={setSlot} options={SLOT_OPTIONS} size="sm" />
    </div>
  )

  const backButton =
    !editing && mode.kind !== "search" ? (
      <Button variant="ghost" className="w-fit" onPress={() => setMode({ kind: "search" })}>
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} data-icon="inline-start" />
        Back to search
      </Button>
    ) : null

  let footer: React.ReactNode = null
  if (mode.kind === "amount") {
    footer = (
      <Button size="lg" onPress={() => void submitAmount()} isDisabled={mode.quantity.grams <= 0}>
        {editing ? "Save" : `Add to ${SLOT_LABELS[slot].toLowerCase()}`}
      </Button>
    )
  } else if (mode.kind === "quick") {
    footer = (
      <Button size="lg" type="submit" form="quick-add-form">
        {editing ? "Save" : `Add to ${SLOT_LABELS[slot].toLowerCase()}`}
      </Button>
    )
  }

  return (
    <ResponsiveSheet isOpen={isOpen} onOpenChange={onOpenChange} title={title} footer={footer}>
      {mode.kind === "search" ? (
        <>
          {slotPicker}
          <SearchList
            label="Search foods and meals"
            placeholder="Search foods and meals"
            items={items}
            idleItems={idleItems}
            getKey={pickKey}
            getText={pickText}
            query={query}
            onQueryChange={setQuery}
            autoFocus
            toolbar={
              <Button variant="outline" onPress={() => setMode({ kind: "quick" })}>
                <HugeiconsIcon icon={FlashIcon} strokeWidth={2} data-icon="inline-start" />
                Quick add
              </Button>
            }
            idleHeader={
              <p className="text-xs font-medium text-muted-foreground">
                {(recentIds?.length ?? 0) > 0 || (meals?.length ?? 0) > 0 ? "Saved meals and recent foods" : "Search the library of 190+ foods"}
              </p>
            }
            noResults={
              <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
                <p>No foods match “{query}”.</p>
                <Button variant="outline" onPress={() => setMode({ kind: "quick" })}>
                  Quick add “{query}” instead
                </Button>
              </div>
            }
            renderItem={(p) =>
              p.type === "food" ? (
                <FoodRow
                  food={p.food}
                  baseName={p.food.baseFoodId ? foodsById.get(p.food.baseFoodId)?.name : undefined}
                  onPress={() => setMode({ kind: "amount", food: p.food, quantity: defaultQuantity(p.food) })}
                />
              ) : (
                <ListRow
                  leading={<HugeiconsIcon icon={RiceBowl01Icon} strokeWidth={2} className="size-4 text-muted-foreground" />}
                  title={p.meal.name}
                  pressLabel={`Log meal ${p.meal.name}`}
                  subtitle={
                    <span className="flex flex-col gap-0.5">
                      <span>{p.meal.items.length} items · tap to log all</span>
                      <MacroChips macros={p.totals} />
                    </span>
                  }
                  trailing={<Badge variant="outline">Meal</Badge>}
                  onPress={() => void pickMeal(p.meal)}
                />
              )
            }
          />
        </>
      ) : null}

      {mode.kind === "amount" && amountFood ? (
        <>
          {backButton}
          <QuantityField
            value={mode.quantity}
            onChange={(quantity) => setMode({ ...mode, quantity })}
            servings={amountFood.servings}
          />
          {slotPicker}
          <AmountPreview food={amountFood} grams={mode.quantity.grams} remaining={remaining} previous={entry?.macros} />
        </>
      ) : null}

      {mode.kind === "quick" ? (
        <>
          {backButton}
          {slotPicker}
          <QuickAddForm
            id="quick-add-form"
            initial={isQuickEntry && entry ? { name: entry.name, macros: entry.macros, grams: entry.grams } : undefined}
            initialName={query}
            onSubmit={async (input) => {
              if (entry) {
                await updateQuickAdd(entry, input, slot)
                toast.success("Entry updated")
              } else {
                await quickAdd(input, date, slot)
                toast.success(`Added ${input.name || "quick add"} to ${SLOT_LABELS[slot].toLowerCase()}`)
              }
              close()
            }}
          />
        </>
      ) : null}
    </ResponsiveSheet>
  )
}

function AmountPreview({
  food,
  grams,
  remaining,
  previous,
}: {
  food: FoodLike
  grams: number
  remaining?: Macros
  previous?: Macros
}) {
  const adds = scaleMacros(food.per100g, grams)
  // When editing, the old amount is already counted in "remaining".
  const base = remaining && previous ? addMacros(remaining, previous) : remaining
  const after = base ? remainingMacros(base, adds) : undefined
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3" aria-live="polite">
      <p className="text-xs font-medium">This entry</p>
      <MacroChips macros={adds} className="text-xs" />
      {after ? (
        <p className="text-xs text-muted-foreground tabular-nums">
          {after.kcal >= 0 ? `${Math.round(after.kcal)} kcal` : `${Math.round(-after.kcal)} kcal over`} and{" "}
          {after.protein >= 0 ? `${Math.round(after.protein)} g protein left` : `${Math.round(-after.protein)} g protein over`} after this.
        </p>
      ) : null}
    </div>
  )
}
