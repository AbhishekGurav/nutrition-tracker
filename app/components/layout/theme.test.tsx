import { afterEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeProvider } from "next-themes"

import { ThemeToggle } from "~/components/layout/theme-toggle"
import { PalettePicker } from "~/features/settings/palette-picker"
import { contrast } from "~/lib/color"
import { PALETTES, paletteCss, type ModeSpec } from "~/lib/palettes"
import { getPalette, setPalette } from "~/lib/palette-store"

afterEach(() => {
  setPalette("espresso")
  localStorage.clear()
})

describe("ThemeToggle", () => {
  it("switches between light and dark", async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    )
    await user.click(await screen.findByRole("button", { name: "Switch to dark mode" }))
    expect(document.documentElement).toHaveClass("dark")
    await user.click(screen.getByRole("button", { name: "Switch to light mode" }))
    expect(document.documentElement).not.toHaveClass("dark")
  })
})

describe("palettes", () => {
  it("picker applies and remembers the chosen palette", async () => {
    const user = userEvent.setup()
    render(
      <ThemeProvider attribute="class" defaultTheme="light">
        <PalettePicker />
      </ThemeProvider>
    )
    expect(screen.getAllByRole("radio")).toHaveLength(PALETTES.length)
    expect(screen.getByRole("radio", { name: /Espresso & Gold/ })).toBeChecked()
    await user.click(screen.getByRole("radio", { name: /Bordeaux/ }))
    expect(getPalette()).toBe("bordeaux")
    expect(document.documentElement.dataset.palette).toBe("bordeaux")
    expect(localStorage.getItem("macro-forge-palette")).toBe("bordeaux")
  })

  it("generates CSS for every palette in both modes", () => {
    const css = paletteCss()
    for (const p of PALETTES) {
      expect(css).toContain(`:root[data-palette="${p.id}"]{`)
      expect(css).toContain(`:root[data-palette="${p.id}"].dark{`)
    }
    expect(css).toContain(":root{--background:")
  })
})

// WCAG 2.x contrast, computed from the palette definitions.
type ColorKey = Exclude<keyof ModeSpec, "macros" | "borderAlpha">
const TEXT_PAIRS: [ColorKey, ColorKey][] = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["foreground", "muted"],
  ["mutedForeground", "background"],
  ["mutedForeground", "card"],
  ["primaryForeground", "primary"],
  ["accentForeground", "accent"],
  ["destructive", "card"],
]

describe.each(PALETTES.flatMap((p) => (["light", "dark"] as const).map((mode) => [`${p.name} ${mode}`, p[mode]] as const)))(
  "%s contrast",
  (_, spec: ModeSpec) => {
    it.each(TEXT_PAIRS)("text %s on %s ≥ 4.5:1", (fg, bg) => {
      expect(contrast(spec[fg], spec[bg])).toBeGreaterThanOrEqual(4.5)
    })
    it.each(["kcal", "protein", "carbs", "fat"] as const)("%s graphic on card ≥ 3:1", (m) => {
      expect(contrast(spec.macros[m], spec.card)).toBeGreaterThanOrEqual(3)
    })
  }
)
