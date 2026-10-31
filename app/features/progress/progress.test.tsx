import { beforeEach, describe, expect, it } from "vitest"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { db } from "~/data/db"
import { repositories } from "~/data/repositories"
import { ensureSeeded } from "~/data/seed"
import { renderWithRouter } from "~/test/render"
import { SidebarProvider } from "~/components/ui/sidebar"
import { ProgressPage, type ProgressTab } from "~/features/progress/progress-page"
import { loadSampleData } from "~/features/settings/sample-data"

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await ensureSeeded(db)
})

function renderProgress(tab: ProgressTab = "body") {
  return renderWithRouter(
    <SidebarProvider>
      <ProgressPage tab={tab} onChange={() => {}} />
    </SidebarProvider>
  )
}

describe("Progress", () => {
  it("shows empty states with no data", async () => {
    await renderProgress("body")
    expect(await screen.findByText("Log at least two weigh-ins to see a trend.")).toBeInTheDocument()
    expect(screen.getByText("No weigh-ins yet.")).toBeInTheDocument()
  })

  it("renders charts and stats from sample data", { timeout: 30_000 }, async () => {
    await loadSampleData(30)
    expect((await repositories.sessions.all()).length).toBeGreaterThan(5)

    const { unmount } = await renderProgress("body")
    expect(await screen.findByRole("img", { name: /Weight trend chart/ })).toBeInTheDocument()
    // Sample data has both scale and tape readings; scale (most used) is charted by default.
    expect(screen.getByRole("img", { name: /Body fat chart, Smart scale/ })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "Lean and fat mass over time" })).toBeInTheDocument()
    unmount()

    await renderProgress("nutrition")
    const logged = await screen.findByText("Days logged")
    expect(within(logged.closest("[data-slot=card]")!).getByText(/\d+\/29/)).toBeInTheDocument()
    expect(screen.getByRole("img", { name: /Calories chart/ })).toBeInTheDocument()
  })

  it("lists personal records on the strength tab", { timeout: 30_000 }, async () => {
    const user = userEvent.setup()
    await loadSampleData(30)
    await renderProgress("strength")
    expect(await screen.findByRole("img", { name: /one-rep max/ })).toBeInTheDocument()
    const prList = screen.getByText("Personal records").closest("[data-slot=card]")!
    expect(within(prList as HTMLElement).getByRole("button", { name: /Show Bench press \(barbell\) chart/ })).toBeInTheDocument()
    await user.click(within(prList as HTMLElement).getByRole("button", { name: /Show Bench press \(barbell\) chart/ }))
  })
})
