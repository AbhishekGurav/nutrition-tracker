import type { BodyComp, BodyCompMethod, BodyGoal, Goal, Sex } from "~/domain/schemas"
import { daysBetween, type DateKey } from "~/domain/dates"

export const METHOD_LABELS: Record<BodyCompMethod, { label: string; hint: string }> = {
  scale: { label: "Smart scale", hint: "Bioimpedance bathroom scale" },
  dexa: { label: "DEXA scan", hint: "Most accurate; clinic scan" },
  bia: { label: "InBody / BIA", hint: "Gym or clinic bioimpedance" },
  calipers: { label: "Calipers", hint: "Skinfold measurement" },
  tape: { label: "Tape measure", hint: "US Navy estimate from waist and neck" },
  other: { label: "Other", hint: "Any other method" },
}

export interface Composition {
  fatKg: number
  leanKg: number
}

/** Fat mass and lean body mass (everything that isn't fat). */
export function composition(weightKg: number, bodyFatPct: number): Composition {
  const fatKg = (weightKg * bodyFatPct) / 100
  return { fatKg, leanKg: weightKg - fatKg }
}

/** Weight at which `leanKg` of lean mass would be `bodyFatPct` body fat. */
export function weightForComposition(leanKg: number, bodyFatPct: number) {
  return leanKg / (1 - bodyFatPct / 100)
}

export interface TapeMeasurements {
  waistCm?: number
  neckCm?: number
  hipCm?: number
}

/**
 * US Navy circumference method (Hodgdon & Beckett), metric form.
 * Men: waist at the navel; women also need hips at the widest point.
 * Returns undefined when inputs are missing or impossible.
 */
export function navyBodyFat(sex: Sex, heightCm: number, { waistCm, neckCm, hipCm }: TapeMeasurements) {
  if (!waistCm || !neckCm || heightCm <= 0) return undefined
  let pct: number
  if (sex === "male") {
    if (waistCm <= neckCm) return undefined
    pct = 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450
  } else {
    if (!hipCm || waistCm + hipCm <= neckCm) return undefined
    pct = 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm)) - 450
  }
  return Number.isFinite(pct) && pct > 2 && pct < 70 ? Math.round(pct * 10) / 10 : undefined
}

/** Most recent reading that has a body-fat value (any method). */
export function latestBodyFat<T extends Pick<BodyComp, "date" | "bodyFatPct" | "updatedAt">>(entries: readonly T[]) {
  let best: T | undefined
  for (const e of entries) {
    if (e.bodyFatPct === undefined) continue
    if (!best || e.date > best.date || (e.date === best.date && e.updatedAt > best.updatedAt)) best = e
  }
  return best
}

export interface CompositionPoint {
  date: DateKey
  bodyFatPct: number
  fatKg: number
  leanKg: number
}

/** Chart series for one method, oldest first. */
export function compositionSeries(entries: readonly BodyComp[], method: BodyCompMethod): CompositionPoint[] {
  return entries
    .filter((e) => e.method === method && e.bodyFatPct !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ date: e.date, bodyFatPct: e.bodyFatPct!, ...composition(e.weightKg, e.bodyFatPct!) }))
}

/** Methods present in the data, most-used first. */
export function methodsInUse(entries: readonly Pick<BodyComp, "method">[]): BodyCompMethod[] {
  const counts = new Map<BodyCompMethod, number>()
  for (const e of entries) counts.set(e.method, (counts.get(e.method) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m)
}

// ---------- Goal planning ----------

export type Feasibility = "comfortable" | "ambitious" | "unrealistic"

/** Weekly fat loss as % of body weight. Above ~1%/week muscle loss gets likely. */
export const FAT_LOSS_PCT_PER_WEEK = { comfortable: 0.7, ambitious: 1.0 }
/** Lean gain per month for a trained lifter; beginners can beat this. */
export const LEAN_GAIN_KG_PER_MONTH = { comfortable: 0.5, ambitious: 1.0 }
const WEEKS_PER_MONTH = 4.345

export interface BodyGoalPlan {
  targetWeightKg: number
  current: Composition & { weightKg: number; bodyFatPct: number }
  target: Composition
  weightChangeKg: number
  fatChangeKg: number
  leanChangeKg: number
  suggestedPhase: Goal
  /** Only when the goal has a future date. */
  weeks?: number
  weekly?: { weightKg: number; fatKg: number; leanKg: number }
  feasibility?: Feasibility
  notes: string[]
}

export function suggestPhase(weightKg: number, weightChange: number, fatChange: number, leanChange: number): Goal {
  const tolerance = weightKg * 0.015
  if (Math.abs(weightChange) <= tolerance) {
    return leanChange > 0.5 || fatChange < -0.5 ? "recomp" : "maintain"
  }
  return weightChange < 0 ? "cut" : "bulk"
}

const RANK: Record<Feasibility, number> = { comfortable: 0, ambitious: 1, unrealistic: 2 }
const rate = (value: number, limits: { comfortable: number; ambitious: number }): Feasibility =>
  value <= limits.comfortable ? "comfortable" : value <= limits.ambitious ? "ambitious" : "unrealistic"

export function planBodyGoal(
  current: { weightKg: number; bodyFatPct: number },
  goal: BodyGoal,
  today: DateKey
): BodyGoalPlan {
  const now = composition(current.weightKg, current.bodyFatPct)
  const targetWeightKg = weightForComposition(goal.targetLeanKg, goal.targetBodyFatPct)
  const target = composition(targetWeightKg, goal.targetBodyFatPct)
  const weightChangeKg = targetWeightKg - current.weightKg
  const fatChangeKg = target.fatKg - now.fatKg
  const leanChangeKg = target.leanKg - now.leanKg
  const notes: string[] = []

  const plan: BodyGoalPlan = {
    targetWeightKg,
    current: { ...now, ...current },
    target,
    weightChangeKg,
    fatChangeKg,
    leanChangeKg,
    suggestedPhase: suggestPhase(current.weightKg, weightChangeKg, fatChangeKg, leanChangeKg),
    notes,
  }

  if (leanChangeKg < -0.5) notes.push("This target loses lean mass. Most lifters aim to keep it.")

  if (goal.targetDate) {
    const days = daysBetween(today, goal.targetDate)
    if (days <= 0) {
      plan.feasibility = "unrealistic"
      notes.push("The target date has passed. Pick a new one.")
      return plan
    }
    const weeks = days / 7
    plan.weeks = weeks
    plan.weekly = { weightKg: weightChangeKg / weeks, fatKg: fatChangeKg / weeks, leanKg: leanChangeKg / weeks }

    let feasibility: Feasibility = "comfortable"
    if (fatChangeKg < 0) {
      const pct = ((-fatChangeKg / weeks) / current.weightKg) * 100
      const f = rate(pct, FAT_LOSS_PCT_PER_WEEK)
      if (f !== "comfortable") notes.push(`Losing ${pct.toFixed(1)}% of body weight in fat per week; 0.5–0.7% protects muscle best.`)
      if (RANK[f] > RANK[feasibility]) feasibility = f
    }
    if (leanChangeKg > 0) {
      const perMonth = (leanChangeKg / weeks) * WEEKS_PER_MONTH
      const f = rate(perMonth, LEAN_GAIN_KG_PER_MONTH)
      if (f !== "comfortable") notes.push(`Gaining ${perMonth.toFixed(1)} kg lean mass a month is fast for most trained lifters.`)
      if (RANK[f] > RANK[feasibility]) feasibility = f
    }
    plan.feasibility = feasibility
  }
  return plan
}

/** Weeks needed at a comfortable pace (used to suggest a date). */
export function comfortableWeeks(plan: BodyGoalPlan) {
  const byFat =
    plan.fatChangeKg < 0
      ? -plan.fatChangeKg / ((plan.current.weightKg * FAT_LOSS_PCT_PER_WEEK.comfortable) / 100)
      : 0
  const byLean = plan.leanChangeKg > 0 ? (plan.leanChangeKg / LEAN_GAIN_KG_PER_MONTH.comfortable) * WEEKS_PER_MONTH : 0
  return Math.ceil(Math.max(byFat, byLean))
}
