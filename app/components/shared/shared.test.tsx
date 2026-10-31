import * as React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { NumberField } from "~/components/shared/number-field"
import { WeightField } from "~/components/shared/weight-field"
import { MacroBar, MacroChips, MacroRing } from "~/components/shared/macro-display"
import { QuantityField, type Quantity } from "~/components/shared/quantity-field"
import { scoreMatch, searchItems } from "~/lib/search"
import type { WeightUnit } from "~/domain/units"

vi.mock("~/hooks/use-mobile", () => ({ useIsMobile: vi.fn(() => true) }))
import { useIsMobile } from "~/hooks/use-mobile"
import { ResponsiveSheet } from "~/components/shared/responsive-sheet"

function ControlledNumber(props: { initial: number | null; min?: number; max?: number; increment?: number }) {
  const [value, setValue] = React.useState(props.initial)
  return (
    <>
      <NumberField label="Reps" value={value} onChange={setValue} min={props.min} max={props.max} increment={props.increment} />
      <output data-testid="value">{String(value)}</output>
    </>
  )
}

describe("NumberField", () => {
  it("steps with the buttons and respects min/max", async () => {
    const user = userEvent.setup()
    render(<ControlledNumber initial={9} max={10} increment={1} />)
    await user.click(screen.getByRole("button", { name: "Increase" }))
    expect(screen.getByTestId("value")).toHaveTextContent("10")
    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Decrease" }))
    expect(screen.getByTestId("value")).toHaveTextContent("9")
  })

  it("accepts typed input on commit and clamps it", async () => {
    const user = userEvent.setup()
    render(<ControlledNumber initial={5} min={0} max={50} />)
    const input = screen.getByRole("textbox", { name: "Reps" })
    // React Aria tunes this per platform (decimal on phones); never a full keyboard.
    expect(["numeric", "decimal"]).toContain(input.getAttribute("inputmode"))
    await user.clear(input)
    await user.type(input, "80{Enter}")
    expect(screen.getByTestId("value")).toHaveTextContent("50")
    await user.clear(input)
    await user.tab()
    expect(screen.getByTestId("value")).toHaveTextContent("null")
  })
})

describe("WeightField", () => {
  function Harness({ unit }: { unit: WeightUnit }) {
    const [kg, setKg] = React.useState<number | null>(100)
    return (
      <>
        <WeightField label="Weight" unit={unit} valueKg={kg} onChangeKg={setKg} />
        <output data-testid="kg">{kg}</output>
      </>
    )
  }

  it("displays in the chosen unit but stores kg", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Harness unit="kg" />)
    expect(screen.getByRole("textbox", { name: "Weight" })).toHaveValue("100")
    rerender(<Harness unit="lb" />)
    expect(screen.getByRole("textbox", { name: "Weight" })).toHaveValue("220.5")
    // +5 lb plate jump
    await user.click(screen.getByRole("button", { name: "Increase" }))
    expect(Number(screen.getByTestId("kg").textContent)).toBeCloseTo((220.5 + 5) * 0.45359237, 3)
  })
})

describe("macro display", () => {
  it("renders progress with an accessible description", () => {
    render(<MacroBar macro="protein" consumed={120} target={180} />)
    const bar = screen.getByRole("progressbar", { name: "Protein" })
    expect(bar).toHaveAttribute("aria-valuetext", "Protein 120 of 180 grams")
    expect(screen.getByText("60g left")).toBeInTheDocument()
  })

  it("shows the over-target state", () => {
    const { container } = render(<MacroBar macro="fat" consumed={90} target={70} />)
    expect(container.querySelector("[data-over]")).not.toBeNull()
    expect(screen.getByText("20g over")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", expect.stringContaining("over target"))
  })

  it("labels the calorie ring and chips for screen readers", () => {
    render(
      <>
        <MacroRing consumed={1200} target={2500} />
        <MacroChips macros={{ kcal: 165, protein: 31, carbs: 0, fat: 3.6 }} />
      </>
    )
    expect(screen.getByRole("img", { name: /Calories 1,200 of 2,500, 1,300 left/ })).toBeInTheDocument()
    expect(screen.getByText(/165 calories, protein 31 grams/)).toBeInTheDocument()
  })
})

describe("QuantityField", () => {
  it("reports grams for a number of servings", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(q: Quantity) => void>()
    function Harness() {
      const [q, setQ] = React.useState<Quantity>({ grams: 50, servingLabel: "1 large" })
      return (
        <QuantityField
          value={q}
          onChange={(next) => {
            setQ(next)
            onChange(next)
          }}
          servings={[{ label: "1 large", grams: 50 }]}
        />
      )
    }
    render(<Harness />)
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveValue("1")
    await user.click(screen.getByRole("button", { name: "Increase" }))
    expect(onChange).toHaveBeenLastCalledWith({ grams: 75, servingLabel: "1 large" })
    expect(screen.getByText("= 75 g")).toBeInTheDocument()
  })
})

describe("ResponsiveSheet", () => {
  it("is a bottom sheet on mobile and a side panel otherwise", () => {
    const { rerender } = render(
      <ResponsiveSheet isOpen onOpenChange={() => {}} title="Add food">
        <p>Body</p>
      </ResponsiveSheet>
    )
    expect(screen.getByRole("dialog", { name: "Add food" }).closest("[data-side]")).toHaveAttribute("data-side", "bottom")
    vi.mocked(useIsMobile).mockReturnValue(false)
    rerender(
      <ResponsiveSheet isOpen onOpenChange={() => {}} title="Add food">
        <p>Body</p>
      </ResponsiveSheet>
    )
    expect(screen.getByRole("dialog", { name: "Add food" }).closest("[data-side]")).toHaveAttribute("data-side", "right")
  })
})

describe("search", () => {
  it("ranks whole-word and prefix matches and tolerates plurals", () => {
    const items = ["Egg noodles, cooked", "Egg, whole", "Eggplant", "Chicken breast"]
    expect(searchItems(items, "egg", (s) => s)[0]).toBe("Egg, whole")
    expect(searchItems(items, "eggs", (s) => s)[0]).toBe("Egg, whole")
    expect(searchItems(items, "chick bre", (s) => s)).toEqual(["Chicken breast"])
    expect(scoreMatch("Chicken breast", "beef")).toBe(0)
    expect(searchItems(items, "  ", (s) => s)).toHaveLength(4)
  })
})
