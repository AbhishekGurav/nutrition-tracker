import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons"

import type { Food, Meal, MealItem } from "~/domain/schemas"
import { scaleMacros } from "~/domain/macros"
import { repositories } from "~/data/repositories"
import { useFoods } from "~/hooks/use-data"
import { Button } from "~/components/ui/button"
import { FieldLegend, FieldSet } from "~/components/ui/field"
import { MacroChips } from "~/components/shared/macro-display"
import { NumberField } from "~/components/shared/number-field"
import { ResponsiveSheet } from "~/components/shared/responsive-sheet"
import { SearchList } from "~/components/shared/search-list"
import { TextField } from "~/components/shared/text-field"
import { FoodRow } from "~/features/food/food-row"
import { defaultQuantity, mealTotals } from "~/features/food/food-logging"

interface MealFormSheetProps {
  meal?: Meal
  onClose: () => void
}

/** Build a saved meal from foods and amounts. */
export function MealFormSheet({ meal, onClose }: MealFormSheetProps) {
  const foods = useFoods()
  const foodsById = React.useMemo(() => new Map((foods ?? []).map((f) => [f.id, f])), [foods])
  const [name, setName] = React.useState(meal?.name ?? "")
  const [items, setItems] = React.useState<MealItem[]>(meal?.items ?? [])
  const [adding, setAdding] = React.useState(!meal)
  const [error, setError] = React.useState<string>()

  const totals = mealTotals({ items }, foodsById)

  const save = async () => {
    if (!name.trim()) return setError("Name the meal.")
    if (items.length === 0) return setError("Add at least one food.")
    if (meal) await repositories.meals.update(meal.id, { name: name.trim(), items })
    else await repositories.meals.create({ name: name.trim(), items })
    toast.success(`Saved ${name.trim()}`)
    onClose()
  }

  const addFood = (food: Food) => {
    setItems((list) => [...list, { foodId: food.id, grams: defaultQuantity(food).grams }])
    setAdding(false)
    setError(undefined)
  }

  return (
    <ResponsiveSheet
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={meal ? "Edit meal" : "New meal"}
      footer={
        adding ? undefined : (
          <Button size="lg" onPress={() => void save()}>
            Save meal
          </Button>
        )
      }
    >
      {adding ? (
        <>
          {items.length > 0 || meal ? (
            <Button variant="ghost" className="w-fit" onPress={() => setAdding(false)}>
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} data-icon="inline-start" />
              Back to meal
            </Button>
          ) : null}
          <SearchList
            label="Add a food to the meal"
            placeholder="Search foods"
            items={foods ?? []}
            getKey={(f) => f.id}
            getText={(f) => `${f.name} ${f.brand ?? ""}`}
            autoFocus
            renderItem={(f) => <FoodRow food={f} onPress={() => addFood(f)} />}
          />
        </>
      ) : (
        <>
          <TextField label="Meal name" value={name} onChange={(v) => (setName(v), setError(undefined))} placeholder="e.g. Post-workout shake" autoFocus={!meal} />
          <FieldSet className="gap-2">
            <FieldLegend variant="label">Foods</FieldLegend>
            {items.map((item, i) => {
              const food = foodsById.get(item.foodId)
              return (
                <div key={`${item.foodId}-${i}`} className="flex flex-col gap-1 rounded-lg border p-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{food?.name ?? "Deleted food"}</span>
                    <Button variant="ghost" size="icon" aria-label={`Remove ${food?.name ?? "food"}`} onPress={() => setItems((l) => l.filter((_, j) => j !== i))}>
                      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <NumberField
                      aria-label={`${food?.name ?? "Food"} grams`}
                      unit="g"
                      value={item.grams}
                      onChange={(g) => g !== null && g > 0 && setItems((l) => l.map((x, j) => (j === i ? { ...x, grams: g } : x)))}
                      increment={10}
                      min={1}
                      max={5000}
                      className="w-40"
                    />
                    {food ? <MacroChips macros={scaleMacros(food.per100g, item.grams)} /> : null}
                  </div>
                </div>
              )
            })}
            <Button variant="outline" className="w-fit" onPress={() => setAdding(true)}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
              Add food
            </Button>
          </FieldSet>
          <div className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
            <span className="text-xs font-medium">Meal total</span>
            <MacroChips macros={totals} className="text-xs" />
          </div>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </>
      )}
    </ResponsiveSheet>
  )
}
