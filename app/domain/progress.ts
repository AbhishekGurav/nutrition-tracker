import type {
  BodyWeight,
  Exercise,
  FoodLogEntry,
  Macros,
  MuscleGroup,
  WorkoutSession,
} from "~/domain/schemas"
import { MUSCLE_GROUPS } from "~/domain/schemas"
import { daysBetween, type DateKey } from "~/domain/dates"
import { addMacros, ZERO_MACROS } from "~/domain/macros"
import { bestsFromSets, workingSets } from "~/domain/strength"

// ---------- Body weight ----------

export interface TrendPoint {
  date: DateKey
  kg: number
  trendKg: number
}

/**
 * Exponentially smoothed weight. Gaps between weigh-ins are treated as
 * multiple days of decay, so sparse logging doesn't over-weight one reading.
 */
export function weightTrend(
  entries: readonly Pick<BodyWeight, "date" | "kg">[],
  alpha = 0.1
): TrendPoint[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const out: TrendPoint[] = []
  let prev: TrendPoint | undefined
  for (const e of sorted) {
    let trendKg = e.kg
    if (prev) {
      const gap = Math.max(1, daysBetween(prev.date, e.date))
      const a = 1 - (1 - alpha) ** gap
      trendKg = prev.trendKg + a * (e.kg - prev.trendKg)
    }
    prev = { date: e.date, kg: e.kg, trendKg }
    out.push(prev)
  }
  return out
}

/** Trend change across the last `days` days (kg; negative = loss). */
export function trendChange(trend: readonly TrendPoint[], days: number) {
  if (trend.length < 2) return undefined
  const last = trend[trend.length - 1]
  let from = trend[0]
  for (let i = trend.length - 2; i >= 0; i--) {
    if (daysBetween(trend[i].date, last.date) >= days) {
      from = trend[i]
      break
    }
  }
  if (from === last) return undefined
  return last.trendKg - from.trendKg
}

// ---------- Nutrition ----------

export function dailyTotals(entries: readonly Pick<FoodLogEntry, "date" | "macros">[]) {
  const map = new Map<DateKey, Macros>()
  for (const e of entries) {
    map.set(e.date, addMacros(map.get(e.date) ?? ZERO_MACROS, e.macros))
  }
  return map
}

export interface NutritionPoint {
  date: DateKey
  logged: boolean
  kcal: number
  protein: number
  kcalTarget: number
  proteinTarget: number
}

export function nutritionSeries(
  days: readonly DateKey[],
  totals: ReadonlyMap<DateKey, Macros>,
  targetFor: (date: DateKey) => Macros | undefined
): NutritionPoint[] {
  return days.map((date) => {
    const t = totals.get(date)
    const target = targetFor(date)
    return {
      date,
      logged: t !== undefined,
      kcal: Math.round(t?.kcal ?? 0),
      protein: Math.round(t?.protein ?? 0),
      kcalTarget: Math.round(target?.kcal ?? 0),
      proteinTarget: Math.round(target?.protein ?? 0),
    }
  })
}

export interface NutritionSummary {
  loggedDays: number
  avgKcal: number
  avgProtein: number
  /** Days with kcal within ±10% of target and protein ≥ 90% of target. */
  onTargetDays: number
}

export function summarizeNutrition(series: readonly NutritionPoint[]): NutritionSummary {
  const logged = series.filter((p) => p.logged)
  if (logged.length === 0) {
    return { loggedDays: 0, avgKcal: 0, avgProtein: 0, onTargetDays: 0 }
  }
  const sum = logged.reduce(
    (acc, p) => ({ kcal: acc.kcal + p.kcal, protein: acc.protein + p.protein }),
    { kcal: 0, protein: 0 }
  )
  const onTargetDays = logged.filter(
    (p) =>
      p.kcalTarget > 0 &&
      Math.abs(p.kcal - p.kcalTarget) <= p.kcalTarget * 0.1 &&
      p.protein >= p.proteinTarget * 0.9
  ).length
  return {
    loggedDays: logged.length,
    avgKcal: Math.round(sum.kcal / logged.length),
    avgProtein: Math.round(sum.protein / logged.length),
    onTargetDays,
  }
}

// ---------- Strength ----------

export interface LiftPoint {
  date: DateKey
  e1rm: number
  weightKg: number
}

/** Best e1RM per session for one exercise, oldest first. */
export function liftHistory(
  sessions: readonly WorkoutSession[],
  exerciseId: string
): LiftPoint[] {
  const points: LiftPoint[] = []
  const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt)
  for (const s of sorted) {
    const sets = s.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets)
    const b = bestsFromSets(sets)
    if (b.e1rm > 0) points.push({ date: s.date, e1rm: b.e1rm, weightKg: b.weightKg })
  }
  return points
}

export interface PersonalRecord {
  exerciseId: string
  name: string
  e1rm: number
  e1rmDate: DateKey
  weightKg: number
  weightDate: DateKey
}

export function personalRecords(
  sessions: readonly WorkoutSession[],
  exercises: ReadonlyMap<string, Pick<Exercise, "name">>
): PersonalRecord[] {
  const map = new Map<string, PersonalRecord>()
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const b = bestsFromSets(ex.sets)
      if (b.e1rm <= 0) continue
      const cur = map.get(ex.exerciseId)
      const name = exercises.get(ex.exerciseId)?.name ?? "Unknown exercise"
      if (!cur) {
        map.set(ex.exerciseId, {
          exerciseId: ex.exerciseId,
          name,
          e1rm: b.e1rm,
          e1rmDate: s.date,
          weightKg: b.weightKg,
          weightDate: s.date,
        })
        continue
      }
      if (b.e1rm > cur.e1rm) Object.assign(cur, { e1rm: b.e1rm, e1rmDate: s.date })
      if (b.weightKg > cur.weightKg) Object.assign(cur, { weightKg: b.weightKg, weightDate: s.date })
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Hard sets per muscle for sessions in [from, to]. Primary muscle counts 1,
 * each secondary counts 0.5 — a common way to estimate weekly volume.
 */
export function setsPerMuscle(
  sessions: readonly WorkoutSession[],
  exercises: ReadonlyMap<string, Pick<Exercise, "primaryMuscle" | "secondaryMuscles">>,
  from: DateKey,
  to: DateKey
): Record<MuscleGroup, number> {
  const out = Object.fromEntries(MUSCLE_GROUPS.map((m) => [m, 0])) as Record<MuscleGroup, number>
  for (const s of sessions) {
    if (s.date < from || s.date > to) continue
    for (const ex of s.exercises) {
      const info = exercises.get(ex.exerciseId)
      if (!info) continue
      const n = workingSets(ex.sets).length
      out[info.primaryMuscle] += n
      for (const m of info.secondaryMuscles) out[m] += n * 0.5
    }
  }
  return out
}
