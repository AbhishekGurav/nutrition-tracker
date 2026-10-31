import { describe, expect, it } from "vitest"
import { screen, within } from "@testing-library/react"

import { renderWithRouter } from "~/test/render"
import { BottomNav } from "~/components/layout/bottom-nav"
import { AppShell } from "~/components/layout/app-shell"
import { isNavActive } from "~/components/layout/nav-items"

describe("BottomNav", () => {
  it("renders the five primary tabs", async () => {
    await renderWithRouter(<BottomNav />)
    const nav = await screen.findByRole("navigation", { name: "Primary" })
    const links = within(nav).getAllByRole("link")
    expect(links).toHaveLength(5)
    for (const label of [
      "Today",
      "Food",
      "Workouts",
      "Supplements",
      "Progress",
    ]) {
      expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument()
    }
  })

  it("marks the active route, including nested paths", async () => {
    await renderWithRouter(<BottomNav />, { path: "/workouts/templates" })
    const nav = await screen.findByRole("navigation", { name: "Primary" })
    const current = within(nav).getByRole("link", { current: "page" })
    expect(current).toHaveTextContent("Workouts")
  })
})

describe("isNavActive", () => {
  it("only matches root exactly", () => {
    expect(isNavActive("/", "/")).toBe(true)
    expect(isNavActive("/", "/food")).toBe(false)
    expect(isNavActive("/food", "/food/abc")).toBe(true)
    expect(isNavActive("/food", "/foodie")).toBe(false)
  })
})

describe("AppShell", () => {
  it("renders content with navigation", async () => {
    await renderWithRouter(
      <AppShell>
        <p>Page content</p>
      </AppShell>
    )
    expect(await screen.findByText("Page content")).toBeInTheDocument()
    expect(
      screen.getAllByRole("navigation", { name: "Primary" }).length
    ).toBeGreaterThan(0)
  })
})
