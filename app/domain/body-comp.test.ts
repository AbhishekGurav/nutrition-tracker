import { describe, expect, it } from "vitest"

import {
  comfortableWeeks,
  composition,
  compositionSeries,
  latestBodyFat,
  methodsInUse,
  navyBodyFat,
  planBodyGoal,
  suggestPhase,
  weightForComposition,
} from "~/domain/body-comp"
import { bmrKatchMcArdle, calculateTargets, energyFactorFor } from "~/domain/tdee"
import type { BodyComp } from "~/domain/schemas"

const reading = (p: Partial<BodyComp> & Pick<BodyComp, "date" | "method">): BodyComp => ({
  id: `${p.date}-${p.method}`,
  createdAt: 0,
  updatedAt: 0,
  weightKg: 80,
  ...p,
})

describe("composition math", () => {
  it("splits weight into fat and lean mass and inverts it", () => {
    expect(composition(80, 20)).toEqual({ fatKg: 16, leanKg: 64 })
    expect(weightForComposition(64, 20)).toBeCloseTo(80)
    expect(weightForComposition(66, 12)).toBeCloseTo(75)
  })

  it("estimates body fat with the US Navy formula", () => {
    expect(navyBodyFat("male", 180, { waistCm: 85, neckCm: 38 })).toBeCloseTo(16.1, 0)
    expect(navyBodyFat("female", 165, { waistCm: 75, neckCm: 33, hipCm: 98 })).toBeCloseTo(28.6, 0)
    expect(navyBodyFat("male", 180, { waistCm: 38, neckCm: 40 })).toBeUndefined()
    expect(navyBodyFat("female", 165, { waistCm: 75, neckCm: 33 })).toBeUndefined()
  })

  it("picks the latest reading with body fat and builds per-method series", () => {
    const entries = [
      reading({ date: "2026-10-01", method: "scale", bodyFatPct: 20 }),
      reading({ date: "2026-10-08", method: "scale", bodyFatPct: 19 }),
      reading({ date: "2026-10-09", method: "dexa", bodyFatPct: 22 }),
      reading({ date: "2026-10-10", method: "scale", muscleMassKg: 60 }),
    ]
    expect(latestBodyFat(entries)?.method).toBe("dexa")
    expect(methodsInUse(entries)).toEqual(["scale", "dexa"])
    const scale = compositionSeries(entries, "scale")
    expect(scale.map((p) => p.bodyFatPct)).toEqual([20, 19])
    expect(scale[1].leanKg).toBeCloseTo(64.8)
  })
})

describe("goal planning", () => {
  it("suggests the phase from the weight change the goal implies", () => {
    expect(suggestPhase(80, -5, -5, 0)).toBe("cut")
    expect(suggestPhase(80, 4, 1, 3)).toBe("bulk")
    expect(suggestPhase(80, -0.5, -2.5, 2)).toBe("recomp")
    expect(suggestPhase(80, 0, 0, 0)).toBe("maintain")
  })

  it("derives target weight and changes from body fat and lean mass", () => {
    // 80 kg at 20% → 64 lean, 16 fat. Goal: 12% with 64 lean → 72.7 kg.
    const plan = planBodyGoal({ weightKg: 80, bodyFatPct: 20 }, { targetBodyFatPct: 12, targetLeanKg: 64 }, "2026-01-01")
    expect(plan.targetWeightKg).toBeCloseTo(72.73, 1)
    expect(plan.fatChangeKg).toBeCloseTo(-7.27, 1)
    expect(plan.leanChangeKg).toBeCloseTo(0)
    expect(plan.suggestedPhase).toBe("cut")
    expect(plan.feasibility).toBeUndefined()
    // 7.27 kg at 0.7% of 80 kg/week ≈ 13 weeks.
    expect(comfortableWeeks(plan)).toBe(13)
  })

  it("rates the pace when a date is set", () => {
    const goal = { targetBodyFatPct: 12, targetLeanKg: 64 }
    const current = { weightKg: 80, bodyFatPct: 20 }
    expect(planBodyGoal(current, { ...goal, targetDate: "2026-06-01" }, "2026-01-01").feasibility).toBe("comfortable")
    // ~0.87% of body weight per week
    expect(planBodyGoal(current, { ...goal, targetDate: "2026-03-15" }, "2026-01-01").feasibility).toBe("ambitious")
    const tooFast = planBodyGoal(current, { ...goal, targetDate: "2026-01-29" }, "2026-01-01")
    expect(tooFast.feasibility).toBe("unrealistic")
    expect(tooFast.notes.length).toBeGreaterThan(0)
    // Lean gain: 4 kg in ~3 months is more than 1 kg/month.
    const bulk = planBodyGoal(current, { targetBodyFatPct: 20, targetLeanKg: 68, targetDate: "2026-04-01" }, "2026-01-01")
    expect(bulk.feasibility).toBe("unrealistic")
    expect(planBodyGoal(current, { ...goal, targetDate: "2025-12-01" }, "2026-01-01").feasibility).toBe("unrealistic")
  })
})

describe("composition-aware targets", () => {
  const base = {
    sex: "male" as const,
    birthYear: 1996,
    heightCm: 180,
    weightKg: 80,
    activityLevel: "moderate" as const,
    goal: "cut" as const,
    proteinPerKg: 2.2,
    trainingDaysPerWeek: 4,
  }
  const now = new Date(2026, 0, 1)

  it("uses Katch-McArdle and lean-mass protein when body fat is known", () => {
    const t = calculateTargets({ ...base, bodyFatPct: 20 }, now)
    expect(t.method).toBe("katch")
    expect(t.leanMassKg).toBeCloseTo(64)
    expect(t.tdee).toBe(Math.round(bmrKatchMcArdle(64) * 1.55))
    expect(t.rest.protein).toBe(Math.round(2.6 * 64)) // default cut, per kg lean
    const custom = calculateTargets({ ...base, bodyFatPct: 20, proteinPerKgLean: 2.2 }, now)
    expect(custom.rest.protein).toBe(Math.round(2.2 * 64))
    expect(calculateTargets(base, now).method).toBe("mifflin")
  })

  it("sets the deficit from the goal's fat-loss pace, within safe limits", () => {
    const current = { weightKg: 80, bodyFatPct: 20 }
    const goal = { targetBodyFatPct: 12, targetLeanKg: 64 }
    const slow = planBodyGoal(current, { ...goal, targetDate: "2026-12-01" }, "2026-01-01")
    const fast = planBodyGoal(current, { ...goal, targetDate: "2026-02-01" }, "2026-01-01")
    expect(energyFactorFor("cut", slow, 2600)).toBe(0.9)
    expect(energyFactorFor("cut", fast, 2600)).toBe(0.75)
    expect(energyFactorFor("cut", undefined, 2600)).toBe(0.8)
    expect(energyFactorFor("recomp", slow, 2600)).toBe(0.95)
    const withPlan = calculateTargets({ ...base, bodyFatPct: 20, plan: slow }, now)
    expect(withPlan.energyFactor).toBe(0.9)
  })
})
