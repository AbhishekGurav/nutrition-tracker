import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { buildSeedFoods } from "~/data/seed"
import { parseQuantity } from "~/services/suggestions/parse-quantity"
import { LocalFuzzyProvider } from "~/services/suggestions/local-fuzzy-provider"
import { SuggestionProvider } from "~/services/suggestions/context"
import type { MacroSuggestionProvider } from "~/services/suggestions/types"
import { QuickAddForm } from "~/features/food/quick-add-form"
import type { Food } from "~/domain/schemas"

describe("parseQuantity", () => {
  it.each([
    ["oats 80g", { text: "oats", grams: 80 }],
    ["200 g white rice", { text: "white rice", grams: 200 }],
    ["chicken breast 1.5kg", { text: "chicken breast", grams: 1500 }],
    ["salmon 6 oz", { text: "salmon", grams: 170.1 }],
    ["2 eggs", { text: "eggs", count: 2 }],
    ["1/2 cup rice", { text: "rice", count: 0.5, servingWord: "cup" }],
    ["1.5 scoops whey", { text: "whey", count: 1.5, servingWord: "scoop" }],
    ["2 grapes", { text: "grapes", count: 2 }],
    ["banana", { text: "banana" }],
  ])("%s", (input, expected) => {
    expect(parseQuantity(input)).toEqual(expected)
  })
})

describe("LocalFuzzyProvider", () => {
  const seed = buildSeedFoods()
  const mine: Food = {
    ...seed.find((f) => f.id === "seed-food-oats-rolled")!,
    id: "user-oats",
    name: "Oats, rolled (my brand)",
    source: "user",
  }
  const provider = new LocalFuzzyProvider(async () => [...seed, mine])

  it("ranks the best match first and scales by grams", async () => {
    const [top] = await provider.suggest("oats 80g")
    expect(top.name).toMatch(/oats/i)
    expect(top.grams).toBe(80)
    expect(top.confidence).toBeGreaterThan(0.5)
  })

  it("prefers the user's own food on a tie", async () => {
    const [top] = await provider.suggest("rolled oats")
    expect(top.foodId).toBe("user-oats")
    expect(top.source).toBe("My foods")
  })

  it("resolves counts to servings", async () => {
    const [egg] = await provider.suggest("2 eggs")
    expect(egg.name).toBe("Egg, whole")
    expect(egg.grams).toBe(100)
    expect(egg.servingLabel).toBe("1 large")
    const [whey] = await provider.suggest("1 scoop whey")
    expect(whey.grams).toBe(30)
  })

  it("returns nothing for empty or unknown text", async () => {
    expect(await provider.suggest("80g")).toEqual([])
    expect(await provider.suggest("zzzz qqqq")).toEqual([])
  })
})

describe("suggestions in the quick-add form", () => {
  it("fills editable fields from any provider", async () => {
    const user = userEvent.setup()
    const fake: MacroSuggestionProvider = {
      id: "fake-ai",
      label: "Test model",
      suggest: async () => [
        { name: "Overnight oats", per100g: { kcal: 150, protein: 6, carbs: 25, fat: 3 }, grams: 200, confidence: 0.9, source: "AI" },
      ],
    }
    let submitted: unknown
    render(
      <SuggestionProvider provider={fake}>
        <QuickAddForm id="qa" onSubmit={(v) => (submitted = v)} />
        <button type="submit" form="qa">
          Save
        </button>
      </SuggestionProvider>
    )
    await user.type(screen.getByRole("textbox", { name: "What did you eat?" }), "overnight oats")
    await user.click(screen.getByRole("button", { name: "Suggest macros" }))
    expect(await screen.findByText("90% match")).toBeInTheDocument()
    expect(screen.getByText(/From test model/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Use Overnight oats/ }))
    expect(screen.getByRole("textbox", { name: "Calories" })).toHaveValue("300")
    expect(screen.getByRole("textbox", { name: "Protein" })).toHaveValue("12")
    // Still editable after a suggestion.
    const protein = screen.getByRole("textbox", { name: "Protein" })
    await user.clear(protein)
    await user.type(protein, "15{Enter}")
    await user.click(screen.getByRole("button", { name: "Save" }))
    expect(submitted).toMatchObject({ grams: 200, macros: { kcal: 300, protein: 15, carbs: 50, fat: 6 } })
  })
})
