import { beforeEach, describe, expect, it } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { db } from "~/data/db"
import { repositories } from "~/data/repositories"
import { OnboardingFlow } from "~/features/onboarding/onboarding-flow"
import { recalculateTargets } from "~/features/settings/profile-service"
import { overrideTarget } from "~/domain/tdee"
import { eraseAllData } from "~/features/settings/backup"
import { ensureSeeded } from "~/data/seed"

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

describe("onboarding", () => {
  it("walks through the steps and saves profile, targets and a weigh-in", async () => {
    const user = userEvent.setup()
    let done = false
    render(<OnboardingFlow onDone={() => (done = true)} />)

    await user.click(screen.getByRole("radio", { name: "Female" }))
    const weight = screen.getByRole("textbox", { name: "Body weight" })
    await user.clear(weight)
    await user.type(weight, "62{Enter}")
    await user.click(screen.getByRole("button", { name: "Continue" }))

    await user.click(screen.getByRole("radio", { name: /Active/ }))
    await user.click(screen.getByRole("button", { name: "Continue" }))

    await user.click(screen.getByRole("radio", { name: /Cut/ }))
    expect(screen.getByRole("textbox", { name: "Protein per kg of body weight" })).toHaveValue("2.2")
    await user.click(screen.getByRole("button", { name: "Continue" }))

    expect(screen.getByRole("group", { name: "Training day" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Start tracking" }))

    await waitFor(() => expect(done).toBe(true))
    const profile = await repositories.profile.get()
    expect(profile).toMatchObject({ sex: "female", weightKg: 62, activityLevel: "active", goal: "cut", proteinPerKg: 2.2 })
    const targets = await repositories.targets.get()
    expect(targets?.rest.protein).toBe(Math.round(62 * 2.2))
    expect((await repositories.bodyWeights.latest())?.kg).toBe(62)
  })
})

describe("onboarding with body composition", () => {
  it("saves a body-fat reading, uses lean-mass math and a composition goal", async () => {
    const user = userEvent.setup()
    let done = false
    render(<OnboardingFlow onDone={() => (done = true)} />)

    const weight = screen.getByRole("textbox", { name: "Body weight" })
    await user.clear(weight)
    await user.type(weight, "80{Enter}")
    await user.type(screen.getByRole("textbox", { name: "Body fat (optional)" }), "20{Enter}")
    await user.click(screen.getByRole("button", { name: "Continue" }))
    await user.click(screen.getByRole("button", { name: "Continue" }))

    await user.click(screen.getByRole("switch", { name: "Set a body composition goal" }))
    // Default: 5 points leaner at today's lean mass → suggests a cut.
    expect(screen.getByRole("textbox", { name: "Target body fat" })).toHaveValue("15")
    await user.click(screen.getByRole("button", { name: "Switch phase to Cut" }))
    expect(screen.getByRole("textbox", { name: "Protein per kg of lean mass" })).toHaveValue("2.6")
    await user.click(screen.getByRole("button", { name: "Continue" }))
    expect(screen.getByText(/from your lean mass/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Start tracking" }))

    await waitFor(() => expect(done).toBe(true))
    const profile = await repositories.profile.get()
    expect(profile?.goal).toBe("cut")
    expect(profile?.bodyGoal).toMatchObject({ targetBodyFatPct: 15, targetLeanKg: 64 })
    const [reading] = await repositories.bodyComps.all()
    expect(reading).toMatchObject({ method: "scale", bodyFatPct: 20, weightKg: 80 })
    expect((await repositories.targets.get())?.rest.protein).toBe(Math.round(2.6 * 64))
  })
})

describe("targets service", () => {
  it("keeps custom values when recalculating after a weight change", async () => {
    await repositories.profile.save({
      sex: "male",
      birthYear: 1994,
      heightCm: 180,
      weightKg: 80,
      unitSystem: "metric",
      activityLevel: "moderate",
      goal: "maintain",
      proteinPerKg: 2,
      trainingDaysPerWeek: 4,
    })
    const first = await recalculateTargets()
    expect(first?.targets.rest.protein).toBe(160)
    await repositories.targets.save(overrideTarget(first!.targets, "rest", "fat", 50))
    await repositories.bodyWeights.upsert("2026-10-30", 90)
    const second = await recalculateTargets()
    expect(second?.targets.rest.protein).toBe(180)
    expect(second?.targets.rest.fat).toBe(50)
    const reset = await recalculateTargets({ reset: true })
    expect(reset?.targets.rest.fat).not.toBe(50)
  })

  it("erasing data keeps the bundled library", async () => {
    await ensureSeeded(db)
    await repositories.foods.create({ name: "Mine", per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 }, servings: [], source: "user" })
    await eraseAllData()
    const foods = await repositories.foods.all()
    expect(foods.some((f) => f.name === "Mine")).toBe(false)
    expect(foods.length).toBeGreaterThan(100)
  })
})
