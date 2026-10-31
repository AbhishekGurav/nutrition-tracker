import { repositories } from "~/data/repositories"
import type { Food, FoodLogEntry, Macros, Meal, MealSlot, NewEntity } from "~/domain/schemas"
import { addDays, type DateKey } from "~/domain/dates"
import { scaleMacros, sumMacros, ZERO_MACROS } from "~/domain/macros"
import type { Quantity } from "~/components/shared/quantity-field"

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
}

export const SLOT_OPTIONS = (Object.keys(SLOT_LABELS) as MealSlot[]).map((value) => ({
  value,
  label: SLOT_LABELS[value],
}))

/** Sensible slot for "add food" based on the time of day. */
export function slotForTime(date = new Date()): MealSlot {
  const h = date.getHours()
  if (h < 11) return "breakfast"
  if (h < 15) return "lunch"
  if (h < 21) return "dinner"
  return "snacks"
}

export type FoodLike = Pick<Food, "name" | "per100g" | "servings"> & { id?: string }

/** Default amount when picking a food: one of its first serving, else 100 g. */
export function defaultQuantity(food: Pick<Food, "servings">): Quantity {
  const s = food.servings[0]
  return s ? { grams: s.grams, servingLabel: s.label } : { grams: 100 }
}

export function describeQuantity(entry: Pick<FoodLogEntry, "grams" | "servingLabel">, servings: Food["servings"] = []) {
  if (entry.grams <= 0) return ""
  const s = entry.servingLabel ? servings.find((x) => x.label === entry.servingLabel) : undefined
  if (s) {
    const count = Math.round((entry.grams / s.grams) * 100) / 100
    return `${count} × ${s.label}`
  }
  return `${Math.round(entry.grams)} g`
}

export function buildEntry(
  food: FoodLike,
  quantity: Quantity,
  date: DateKey,
  slot: MealSlot
): NewEntity<FoodLogEntry> {
  return {
    date,
    slot,
    foodId: food.id,
    name: food.name,
    grams: quantity.grams,
    servingLabel: quantity.servingLabel,
    per100g: { ...food.per100g },
    macros: scaleMacros(food.per100g, quantity.grams),
  }
}

export function logFood(food: FoodLike, quantity: Quantity, date: DateKey, slot: MealSlot) {
  return repositories.foodLog.create(buildEntry(food, quantity, date, slot))
}

/** Re-scale an entry using its own snapshot, so edits never depend on the current food. */
export function updateEntryQuantity(entry: FoodLogEntry, quantity: Quantity, slot: MealSlot = entry.slot) {
  const per100g = entry.per100g
  return repositories.foodLog.update(entry.id, {
    grams: quantity.grams,
    servingLabel: quantity.servingLabel,
    slot,
    macros: per100g ? scaleMacros(per100g, quantity.grams) : entry.macros,
  })
}

export interface QuickAddInput {
  name: string
  macros: Macros
  grams?: number
}

export function quickAdd(input: QuickAddInput, date: DateKey, slot: MealSlot) {
  return repositories.foodLog.create({
    date,
    slot,
    name: input.name.trim() || "Quick add",
    grams: input.grams ?? 0,
    macros: { ...input.macros },
  })
}

export function updateQuickAdd(entry: FoodLogEntry, input: QuickAddInput, slot: MealSlot) {
  return repositories.foodLog.update(entry.id, {
    name: input.name.trim() || "Quick add",
    grams: input.grams ?? entry.grams,
    macros: { ...input.macros },
    slot,
  })
}

export function mealEntries(
  meal: Meal,
  foodsById: ReadonlyMap<string, FoodLike>,
  date: DateKey,
  slot: MealSlot
): NewEntity<FoodLogEntry>[] {
  return meal.items.flatMap((item) => {
    const food = foodsById.get(item.foodId)
    return food ? [buildEntry({ ...food, id: item.foodId }, { grams: item.grams }, date, slot)] : []
  })
}

export function mealTotals(meal: Pick<Meal, "items">, foodsById: ReadonlyMap<string, FoodLike>): Macros {
  return sumMacros(
    meal.items.map((i) => {
      const f = foodsById.get(i.foodId)
      return f ? scaleMacros(f.per100g, i.grams) : ZERO_MACROS
    })
  )
}

export async function logMeal(meal: Meal, foodsById: ReadonlyMap<string, FoodLike>, date: DateKey, slot: MealSlot) {
  return repositories.foodLog.addMany(mealEntries(meal, foodsById, date, slot))
}

/** Copy one slot from the previous day. Returns how many entries were copied. */
export async function copySlotFromPreviousDay(date: DateKey, slot: MealSlot) {
  const prev = await repositories.foodLog.byDate(addDays(date, -1))
  const copies = prev
    .filter((e) => e.slot === slot)
    .map(({ id: _id, createdAt: _c, updatedAt: _u, ...rest }) => ({ ...rest, date }))
  if (copies.length) await repositories.foodLog.addMany(copies)
  return copies.length
}

/** Save the logged foods of a slot as a reusable meal (quick-adds are skipped). */
export async function saveEntriesAsMeal(name: string, entries: readonly FoodLogEntry[]) {
  const items = entries.flatMap((e) => (e.foodId && e.grams > 0 ? [{ foodId: e.foodId, grams: e.grams }] : []))
  if (items.length === 0) return undefined
  return repositories.meals.create({ name, items })
}

export function entriesBySlot(entries: readonly FoodLogEntry[]) {
  const map: Record<MealSlot, FoodLogEntry[]> = { breakfast: [], lunch: [], dinner: [], snacks: [] }
  for (const e of entries) map[e.slot].push(e)
  return map
}
