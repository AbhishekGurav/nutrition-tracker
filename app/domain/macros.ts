import type { Macros } from "~/domain/schemas"
import { round } from "~/domain/units"

export const ZERO_MACROS: Macros = Object.freeze({
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
})

/** Atwater factors (kcal per gram). */
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const

export function scaleMacros(per100g: Macros, grams: number): Macros {
  const f = Math.max(0, grams) / 100
  return {
    kcal: per100g.kcal * f,
    protein: per100g.protein * f,
    carbs: per100g.carbs * f,
    fat: per100g.fat * f,
  }
}

/** Inverse of scaleMacros: totals for `grams` -> per 100g. */
export function toPer100g(totals: Macros, grams: number): Macros {
  if (grams <= 0) return { ...ZERO_MACROS }
  return scaleMacros(totals, (100 * 100) / grams)
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  }
}

export function sumMacros(items: Iterable<Macros>): Macros {
  let total: Macros = { ...ZERO_MACROS }
  for (const m of items) total = addMacros(total, m)
  return total
}

/** Signed difference target - consumed (negative means over). */
export function remainingMacros(target: Macros, consumed: Macros): Macros {
  return {
    kcal: target.kcal - consumed.kcal,
    protein: target.protein - consumed.protein,
    carbs: target.carbs - consumed.carbs,
    fat: target.fat - consumed.fat,
  }
}

export function roundMacros(m: Macros, decimals = 0): Macros {
  return {
    kcal: round(m.kcal, 0),
    protein: round(m.protein, decimals),
    carbs: round(m.carbs, decimals),
    fat: round(m.fat, decimals),
  }
}

export function kcalFromMacros(m: Pick<Macros, "protein" | "carbs" | "fat">) {
  return (
    m.protein * KCAL_PER_GRAM.protein +
    m.carbs * KCAL_PER_GRAM.carbs +
    m.fat * KCAL_PER_GRAM.fat
  )
}

export interface KcalCheck {
  expected: number
  diff: number
  isMismatch: boolean
}

/**
 * Flags labels whose calories don't add up to 4/4/9. Fibre, alcohol and
 * rounding cause small gaps, so we allow 15% or 20 kcal, whichever is larger.
 */
export function checkKcal(m: Macros, tolerance = 0.15, minKcal = 20): KcalCheck {
  const expected = kcalFromMacros(m)
  const diff = m.kcal - expected
  const allowed = Math.max(minKcal, Math.max(m.kcal, expected) * tolerance)
  return { expected, diff, isMismatch: Math.abs(diff) > allowed }
}

/** 0..∞ progress ratio; 0 when no target. */
export function progressRatio(consumed: number, target: number) {
  if (target <= 0) return 0
  return Math.max(0, consumed / target)
}

export function formatGrams(value: number) {
  return `${round(value, value < 10 && value % 1 !== 0 ? 1 : 0)}g`
}

export function formatKcal(value: number) {
  return `${Math.round(value).toLocaleString()} kcal`
}
