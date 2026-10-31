import * as React from "react"
import { beforeEach, describe, expect, it } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { db } from "~/data/db"
import { repositories } from "~/data/repositories"
import { ensureSeeded, seedFoodId } from "~/data/seed"
import { sumMacros } from "~/domain/macros"
import { renderWithRouter } from "~/test/render"
import {
  copySlotFromPreviousDay,
  logFood,
  logMeal,
  saveEntriesAsMeal,
  updateEntryQuantity,
} from "~/features/food/food-logging"
import { MacroInputs, emptyMacroDraft, type MacroDraft } from "~/features/food/macro-inputs"
import { TodayPage } from "~/features/today/today-page"
import { variationDraft } from "~/features/food/food-form"
import { SidebarProvider } from "~/components/ui/sidebar"

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await ensureSeeded(db)
})

const banana = () => repositories.foods.get(seedFoodId("banana")).then((f) => f!)
const oats = () => repositories.foods.get(seedFoodId("oats-rolled")).then((f) => f!)

describe("food logging", () => {
  it("snapshots macros so editing the food later doesn't rewrite history", async () => {
    const mine = await repositories.foods.create(variationDraft(await banana()))
    const entry = await logFood(mine, { grams: 200 }, "2026-10-01", "snacks")
    expect(entry.macros.kcal).toBeCloseTo(178)
    await repositories.foods.update(mine.id, { per100g: { kcal: 500, protein: 0, carbs: 0, fat: 0 } })
    const [stored] = await repositories.foodLog.byDate("2026-10-01")
    expect(stored.macros.kcal).toBeCloseTo(178)
    // Re-scaling uses the snapshot too.
    const updated = await updateEntryQuantity(stored, { grams: 100 })
    expect(updated?.macros.kcal).toBeCloseTo(89)
  })

  it("logs a saved meal as one entry per food with correct totals", async () => {
    const meal = await repositories.meals.create({
      name: "Breakfast bowl",
      items: [
        { foodId: seedFoodId("oats-rolled"), grams: 80 },
        { foodId: seedFoodId("banana"), grams: 118 },
        { foodId: "deleted-food", grams: 50 },
      ],
    })
    const foods = new Map((await repositories.foods.all()).map((f) => [f.id, f]))
    const added = await logMeal(meal, foods, "2026-10-02", "breakfast")
    expect(added).toHaveLength(2)
    const total = sumMacros(added.map((e) => e.macros))
    expect(total.kcal).toBeCloseTo(379 * 0.8 + 89 * 1.18)
  })

  it("copies a slot from the previous day and saves a slot as a meal", async () => {
    await logFood(await oats(), { grams: 80 }, "2026-10-01", "breakfast")
    await logFood(await banana(), { grams: 118, servingLabel: "1 medium" }, "2026-10-01", "breakfast")
    await repositories.foodLog.create({ date: "2026-10-01", slot: "breakfast", name: "Coffee", grams: 0, macros: { kcal: 5, protein: 0, carbs: 0, fat: 0 } })
    expect(await copySlotFromPreviousDay("2026-10-02", "breakfast")).toBe(3)
    expect(await copySlotFromPreviousDay("2026-10-02", "dinner")).toBe(0)
    const meal = await saveEntriesAsMeal("Usual", await repositories.foodLog.byDate("2026-10-02"))
    expect(meal?.items).toHaveLength(2) // quick-add skipped
  })
})

describe("macro inputs", () => {
  it("warns when calories don't match 4/4/9 and offers a fix", async () => {
    const user = userEvent.setup()
    function Harness() {
      const [v, setV] = React.useState<MacroDraft>({ ...emptyMacroDraft(), kcal: 500, protein: 10, carbs: 10, fat: 1 })
      return <MacroInputs value={v} onChange={setV} />
    }
    render(<Harness />)
    expect(screen.getByRole("status")).toHaveTextContent("about 89 kcal")
    await user.click(screen.getByRole("button", { name: "Use 89" }))
    expect(screen.queryByRole("status")).toBeNull()
  })
})

describe("Today", () => {
  it("shows the chosen date's entries and updates totals after logging", async () => {
    await repositories.targets.save({
      training: { kcal: 2800, protein: 180, carbs: 330, fat: 80 },
      rest: { kcal: 2400, protein: 180, carbs: 230, fat: 80 },
      overrides: { training: {}, rest: {} },
    })
    await logFood(await oats(), { grams: 80 }, "2026-10-01", "breakfast")
    const user = userEvent.setup()
    await renderWithRouter(
      <SidebarProvider>
        <TodayPage date="2026-10-02" onDateChange={() => {}} />
      </SidebarProvider>
    )

    // A different day: empty.
    expect(await screen.findAllByText("Nothing logged yet")).toHaveLength(4)

    await user.click(screen.getByRole("button", { name: "Add food to lunch" }))
    const dialog = await screen.findByRole("dialog", { name: "Add food" })
    await user.type(within(dialog).getByRole("searchbox", { name: "Search foods and meals" }), "banana")
    await user.click(await within(dialog).findByRole("button", { name: "Banana" }))
    await user.click(within(dialog).getByRole("button", { name: "Add to lunch" }))

    await waitFor(async () => expect(await repositories.foodLog.byDate("2026-10-02")).toHaveLength(1))
    expect(await screen.findByRole("img", { name: /Calories 105 of 2,400/ })).toBeInTheDocument()
    expect(await repositories.foodLog.byDate("2026-10-01")).toHaveLength(1)
  })
})
