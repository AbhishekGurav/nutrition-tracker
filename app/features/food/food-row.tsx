import type { Food } from "~/domain/schemas"
import { scaleMacros } from "~/domain/macros"
import { Badge } from "~/components/ui/badge"
import { ListRow, type RowAction } from "~/components/shared/list-row"
import { MacroChips } from "~/components/shared/macro-display"
import { defaultQuantity } from "~/features/food/food-logging"

interface FoodRowProps {
  food: Food
  onPress?: () => void
  actions?: readonly RowAction[]
  /** Name of the base food when this is a variation. */
  baseName?: string
}

/** A food in any list: name, origin badge and macros for its default portion. */
export function FoodRow({ food, onPress, actions, baseName }: FoodRowProps) {
  const q = defaultQuantity(food)
  const portion = q.servingLabel ? `${q.servingLabel} (${Math.round(q.grams)} g)` : "100 g"
  return (
    <ListRow
      title={food.name}
      pressLabel={food.name}
      subtitle={
        <span className="flex flex-col gap-0.5">
          <span className="truncate">
            {baseName ? `Variation of ${baseName} · ` : food.brand ? `${food.brand} · ` : ""}
            {portion}
          </span>
          <MacroChips macros={scaleMacros(food.per100g, q.grams)} />
        </span>
      }
      trailing={
        food.source === "user" ? <Badge variant="secondary">{food.baseFoodId ? "Variation" : "Mine"}</Badge> : null
      }
      onPress={onPress}
      actions={actions}
    />
  )
}
