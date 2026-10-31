import { describe, expect, it } from "vitest"

import {
  addDays,
  dateRange,
  daysBetween,
  formatDayLabel,
  formatTimer,
  isDateKey,
  lastNDays,
  toDateKey,
} from "~/domain/dates"
import {
  formatWeight,
  fromDisplayWeight,
  kgToLb,
  lbToKg,
  plateIncrement,
  roundToIncrement,
  toDisplayWeight,
  cmToFeetInches,
  feetInchesToCm,
} from "~/domain/units"
import {
  checkKcal,
  kcalFromMacros,
  remainingMacros,
  scaleMacros,
  sumMacros,
  toPer100g,
} from "~/domain/macros"
import {
  bmrMifflinStJeor,
  calculateTargets,
  clearOverride,
  macrosForCalories,
  mergeTargets,
  overrideTarget,
  splitDayCalories,
} from "~/domain/tdee"
import {
  bestSetByE1RM,
  epley1RM,
  findSessionPRs,
  historyBests,
  lastPerformance,
  prCountsBySession,
  volume,
} from "~/domain/strength"
import { adherence, currentStreak, dayStatus } from "~/domain/streaks"
import {
  liftHistory,
  nutritionSeries,
  personalRecords,
  setsPerMuscle,
  summarizeNutrition,
  trendChange,
  weightTrend,
  dailyTotals,
} from "~/domain/progress"
import type { SetEntry, WorkoutSession } from "~/domain/schemas"

const set = (p: Partial<SetEntry> & { id: string }): SetEntry => ({
  weightKg: 100,
  reps: 5,
  isWarmup: false,
  done: true,
  ...p,
})

const session = (
  id: string,
  date: string,
  startedAt: number,
  exercises: WorkoutSession["exercises"]
): WorkoutSession => ({
  id,
  date,
  name: "Test",
  startedAt,
  endedAt: startedAt + 1,
  exercises,
  createdAt: startedAt,
  updatedAt: startedAt,
})

describe("dates", () => {
  it("formats and validates keys", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05")
    expect(isDateKey("2026-02-29")).toBe(false)
    expect(isDateKey("2028-02-29")).toBe(true)
    expect(isDateKey("2026-1-5")).toBe(false)
    expect(isDateKey(42)).toBe(false)
  })

  it("does calendar arithmetic across month/year and DST boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28")
    expect(addDays("2026-03-08", 1)).toBe("2026-03-09")
    expect(daysBetween("2026-10-25", "2026-11-02")).toBe(8)
    expect(dateRange("2026-01-30", "2026-02-02")).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ])
    expect(dateRange("2026-01-02", "2026-01-01")).toEqual([])
    expect(lastNDays("2026-01-03", 3)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"])
  })

  it("labels relative days", () => {
    expect(formatDayLabel("2026-10-31", "2026-10-31")).toBe("Today")
    expect(formatDayLabel("2026-10-30", "2026-10-31")).toBe("Yesterday")
    expect(formatDayLabel("2026-11-01", "2026-10-31")).toBe("Tomorrow")
    expect(formatTimer(65)).toBe("1:05")
    expect(formatTimer(3729)).toBe("1:02:09")
  })
})

describe("units", () => {
  it("converts kg and lb both ways", () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 3)
    expect(lbToKg(225)).toBeCloseTo(102.058, 3)
    // Storage stays unrounded so a display round-trip is exact.
    expect(toDisplayWeight(fromDisplayWeight(225, "lb"), "lb")).toBe(225)
    expect(toDisplayWeight(102.5, "kg")).toBe(102.5)
  })

  it("rounds to plate increments", () => {
    expect(roundToIncrement(101.2, plateIncrement("kg"))).toBe(100)
    expect(roundToIncrement(101.3, 2.5)).toBe(102.5)
    expect(roundToIncrement(227.4, plateIncrement("lb"))).toBe(225)
    expect(roundToIncrement(10, 0)).toBe(10)
  })

  it("formats weights and heights", () => {
    expect(formatWeight(100, "kg")).toBe("100 kg")
    expect(formatWeight(100, "lb")).toBe("220.5 lb")
    expect(cmToFeetInches(180)).toEqual({ feet: 5, inches: 11 })
    expect(cmToFeetInches(182.8)).toEqual({ feet: 6, inches: 0 })
    expect(feetInchesToCm(6, 0)).toBeCloseTo(182.88, 2)
  })
})

describe("macros", () => {
  const rice = { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 }

  it("scales per-100g values and inverts back", () => {
    expect(scaleMacros(rice, 200)).toEqual({ kcal: 260, protein: 5.4, carbs: 56, fat: 0.6 })
    expect(scaleMacros(rice, -5).kcal).toBe(0)
    const per = toPer100g({ kcal: 260, protein: 5.4, carbs: 56, fat: 0.6 }, 200)
    expect(per.kcal).toBeCloseTo(130)
    expect(per.protein).toBeCloseTo(2.7)
    expect(toPer100g(rice, 0).kcal).toBe(0)
  })

  it("sums and computes remaining (negative when over)", () => {
    const total = sumMacros([rice, rice])
    expect(total.kcal).toBe(260)
    const left = remainingMacros({ kcal: 200, protein: 10, carbs: 10, fat: 10 }, total)
    expect(left.kcal).toBe(-60)
    expect(sumMacros([]).kcal).toBe(0)
  })

  it("checks kcal against 4/4/9", () => {
    expect(kcalFromMacros({ protein: 10, carbs: 10, fat: 10 })).toBe(170)
    expect(checkKcal({ kcal: 165, protein: 31, carbs: 0, fat: 3.6 }).isMismatch).toBe(false)
    expect(checkKcal({ kcal: 400, protein: 31, carbs: 0, fat: 3.6 }).isMismatch).toBe(true)
    // Small absolute gaps on low-calorie foods are tolerated.
    expect(checkKcal({ kcal: 25, protein: 1, carbs: 1, fat: 0 }).isMismatch).toBe(false)
  })
})

describe("tdee & targets", () => {
  const now = new Date(2026, 5, 1)
  const input = {
    sex: "male" as const,
    birthYear: 1996,
    heightCm: 180,
    weightKg: 80,
    activityLevel: "moderate" as const,
    goal: "maintain" as const,
    proteinPerKg: 2,
    trainingDaysPerWeek: 4,
  }

  it("implements Mifflin-St Jeor", () => {
    expect(bmrMifflinStJeor({ sex: "male", weightKg: 80, heightCm: 180, age: 30 })).toBe(1780)
    expect(bmrMifflinStJeor({ sex: "female", weightKg: 60, heightCm: 165, age: 30 })).toBeCloseTo(
      1320.25
    )
  })

  it("keeps the weekly average when shifting calories to training days", () => {
    const { training, rest } = splitDayCalories(2500, 4)
    expect((training * 4 + rest * 3) / 7).toBeCloseTo(2500)
    expect(training).toBeGreaterThan(rest)
    expect(splitDayCalories(2500, 0)).toEqual({ training: 2500, rest: 2500 })
  })

  it("calculates training and rest targets", () => {
    const t = calculateTargets(input, now)
    expect(t.tdee).toBe(Math.round(1780 * 1.55))
    expect(t.training.protein).toBe(160)
    expect(t.rest.protein).toBe(160)
    expect(t.training.fat).toBe(t.rest.fat)
    expect(t.training.carbs).toBeGreaterThan(t.rest.carbs)
    expect(t.training.kcal).toBeGreaterThan(t.rest.kcal)
    const cut = calculateTargets({ ...input, goal: "cut" }, now)
    expect(cut.goalKcal).toBeLessThan(t.goalKcal)
  })

  it("clamps a negative carb remainder to 0", () => {
    const m = macrosForCalories(1000, 200, 60)
    expect(m.carbs).toBe(0)
    expect(m.kcal).toBe(200 * 4 + 60 * 9)
  })

  it("keeps overrides through recalculation unless reset", () => {
    const calc = calculateTargets(input, now)
    let targets = mergeTargets(calc, undefined)
    targets = overrideTarget(targets, "rest", "protein", 200)
    const recalculated = calculateTargets({ ...input, weightKg: 90 }, now)
    const merged = mergeTargets(recalculated, { ...targets })
    expect(merged.rest.protein).toBe(200)
    expect(merged.overrides.rest.protein).toBe(true)
    expect(merged.training.protein).toBe(recalculated.training.protein)
    const reset = mergeTargets(recalculated, { ...targets }, { reset: true })
    expect(reset.rest.protein).toBe(recalculated.rest.protein)
    expect(reset.overrides.rest).toEqual({})
    const cleared = clearOverride(merged, recalculated, "rest", "protein")
    expect(cleared.rest.protein).toBe(recalculated.rest.protein)
    expect(cleared.overrides.rest.protein).toBeUndefined()
  })
})

describe("strength", () => {
  it("estimates 1RM with Epley", () => {
    expect(epley1RM(100, 0)).toBe(0)
    expect(epley1RM(100, 1)).toBe(100)
    expect(epley1RM(100, 5)).toBeCloseTo(116.67, 2)
    expect(epley1RM(0, 5)).toBe(0)
  })

  it("ignores warmups, undone and zero-rep sets", () => {
    const sets = [
      set({ id: "w", weightKg: 140, reps: 3, isWarmup: true }),
      set({ id: "u", weightKg: 150, reps: 3, done: false }),
      set({ id: "z", weightKg: 160, reps: 0 }),
      set({ id: "a", weightKg: 100, reps: 5 }),
      set({ id: "b", weightKg: 105, reps: 3 }),
    ]
    expect(bestSetByE1RM(sets)?.id).toBe("a")
    expect(volume(sets)).toBe(100 * 5 + 105 * 3)
  })

  it("flags only the best set per PR kind and nothing without history", () => {
    const sets = [
      set({ id: "a", weightKg: 100, reps: 8 }),
      set({ id: "b", weightKg: 110, reps: 2 }),
      set({ id: "c", weightKg: 90, reps: 5, isWarmup: true }),
    ]
    expect(findSessionPRs(sets, undefined).size).toBe(0)
    const prs = findSessionPRs(sets, { e1rm: 120, weightKg: 105 })
    expect(prs.get("a")).toEqual(["e1rm"])
    expect(prs.get("b")).toEqual(["weight"])
    expect(prs.has("c")).toBe(false)
    expect(findSessionPRs(sets, { e1rm: 200, weightKg: 200 }).size).toBe(0)
  })

  it("derives history, last performance and per-session PR counts", () => {
    const s1 = session("s1", "2026-10-01", 1, [
      { id: "e1", exerciseId: "bench", sets: [set({ id: "1", weightKg: 80, reps: 5 })] },
    ])
    const s2 = session("s2", "2026-10-03", 2, [
      { id: "e2", exerciseId: "bench", sets: [set({ id: "2", weightKg: 85, reps: 5 })] },
      { id: "e3", exerciseId: "squat", sets: [set({ id: "3", weightKg: 120, reps: 5 })] },
    ])
    const open: WorkoutSession = {
      ...session("s3", "2026-10-05", 3, [
        { id: "e4", exerciseId: "bench", sets: [set({ id: "4", weightKg: 200, reps: 5 })] },
      ]),
      endedAt: undefined,
    }
    expect(historyBests([s1, s2], "bench")?.weightKg).toBe(85)
    expect(historyBests([s1, s2], "bench", "s2")?.weightKg).toBe(80)
    expect(historyBests([s1], "deadlift")).toBeUndefined()
    expect(lastPerformance([s1, s2], "bench")?.[0].weightKg).toBe(85)
    const counts = prCountsBySession([s2, s1, open])
    expect(counts.get("s1")).toBe(0)
    expect(counts.get("s2")).toBe(1)
    expect(counts.has("s3")).toBe(false)
  })
})

describe("supplement streaks", () => {
  const supps = [
    { id: "creatine", active: true, startDate: "2026-10-01" },
    { id: "vitd", active: true, startDate: "2026-10-01" },
    { id: "paused", active: false, startDate: "2026-10-01" },
  ]
  const logsFor = (dates: string[], ids = ["creatine", "vitd"]) =>
    dates.flatMap((date) => ids.map((supplementId) => ({ date, supplementId })))

  it("excludes inactive and not-yet-started supplements", () => {
    expect(dayStatus(supps, new Set(["creatine", "vitd"]), "2026-10-02")).toEqual({
      taken: 2,
      total: 2,
      complete: true,
    })
    expect(dayStatus(supps, undefined, "2026-09-30").total).toBe(0)
  })

  it("counts consecutive complete days and breaks on a miss", () => {
    const logs = logsFor(["2026-10-03", "2026-10-04", "2026-10-06", "2026-10-07"])
    // Today (10-08) incomplete doesn't break; 10-05 missed does.
    expect(currentStreak(supps, logs, "2026-10-08")).toBe(2)
    expect(currentStreak(supps, logs, "2026-10-07")).toBe(2)
    const partial = [...logs, { date: "2026-10-08", supplementId: "creatine" }]
    expect(currentStreak(supps, partial, "2026-10-08")).toBe(2)
    expect(currentStreak(supps, [], "2026-10-08")).toBe(0)
  })

  it("computes adherence percentage", () => {
    const logs = [...logsFor(["2026-10-01"]), { date: "2026-10-02", supplementId: "creatine" }]
    expect(adherence(supps, logs, ["2026-10-01", "2026-10-02"])).toBe(75)
    expect(adherence(supps, [], ["2026-09-01"])).toBe(0)
  })
})

describe("progress selectors", () => {
  it("smooths weight with gap-aware EMA", () => {
    const trend = weightTrend([
      { date: "2026-10-03", kg: 81 },
      { date: "2026-10-01", kg: 80 },
      { date: "2026-10-02", kg: 82 },
    ])
    expect(trend.map((p) => p.date)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"])
    expect(trend[0].trendKg).toBe(80)
    expect(trend[1].trendKg).toBeCloseTo(80.2)
    const gap = weightTrend([
      { date: "2026-10-01", kg: 80 },
      { date: "2026-10-11", kg: 90 },
    ])
    expect(gap[1].trendKg).toBeCloseTo(80 + (1 - 0.9 ** 10) * 10)
    expect(trendChange(gap, 7)).toBeCloseTo(gap[1].trendKg - 80)
    expect(trendChange([], 7)).toBeUndefined()
  })

  it("builds nutrition series and summary", () => {
    const totals = dailyTotals([
      { date: "2026-10-01", macros: { kcal: 2000, protein: 150, carbs: 200, fat: 60 } },
      { date: "2026-10-01", macros: { kcal: 500, protein: 30, carbs: 50, fat: 10 } },
      { date: "2026-10-02", macros: { kcal: 1500, protein: 100, carbs: 150, fat: 40 } },
    ])
    const series = nutritionSeries(["2026-10-01", "2026-10-02", "2026-10-03"], totals, () => ({
      kcal: 2500,
      protein: 180,
      carbs: 250,
      fat: 70,
    }))
    expect(series[0]).toMatchObject({ kcal: 2500, protein: 180, logged: true })
    expect(series[2].logged).toBe(false)
    const summary = summarizeNutrition(series)
    expect(summary).toEqual({ loggedDays: 2, avgKcal: 2000, avgProtein: 140, onTargetDays: 1 })
    expect(summarizeNutrition([]).loggedDays).toBe(0)
  })

  it("derives lift history, PRs and sets per muscle", () => {
    const sessions = [
      session("a", "2026-10-01", 1, [
        { id: "1", exerciseId: "bench", sets: [set({ id: "x", weightKg: 100, reps: 5 }), set({ id: "y", weightKg: 100, reps: 5 })] },
      ]),
      session("b", "2026-10-05", 2, [
        { id: "2", exerciseId: "bench", sets: [set({ id: "z", weightKg: 110, reps: 1 })] },
      ]),
    ]
    const exercises = new Map([
      ["bench", { name: "Bench press", primaryMuscle: "chest" as const, secondaryMuscles: ["triceps" as const, "shoulders" as const] }],
    ])
    const hist = liftHistory(sessions, "bench")
    expect(hist).toHaveLength(2)
    expect(hist[0].e1rm).toBeCloseTo(116.67, 1)
    const prs = personalRecords(sessions, exercises)
    expect(prs[0]).toMatchObject({ e1rmDate: "2026-10-01", weightKg: 110, weightDate: "2026-10-05" })
    const vol = setsPerMuscle(sessions, exercises, "2026-10-01", "2026-10-03")
    expect(vol.chest).toBe(2)
    expect(vol.triceps).toBe(1)
    expect(vol.quads).toBe(0)
  })
})
