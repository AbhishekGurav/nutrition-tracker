import type { Supplement, SupplementTiming } from "~/domain/schemas"
import { SUPPLEMENT_TIMINGS } from "~/domain/schemas"

export const TIMING_LABELS: Record<SupplementTiming, string> = {
  morning: "Morning",
  with_meal: "With a meal",
  pre_workout: "Pre-workout",
  post_workout: "Post-workout",
  evening: "Evening",
}

export const TIMING_OPTIONS = SUPPLEMENT_TIMINGS.map((value) => ({ value, label: TIMING_LABELS[value] }))

export const COMMON_UNITS = ["g", "mg", "mcg", "IU", "caps", "tabs", "ml", "scoops"] as const

export function formatDose(s: Pick<Supplement, "dose" | "unit">) {
  return `${s.dose.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${s.unit}`
}

/** Supplements grouped by timing in the canonical order, empty groups omitted. */
export function groupByTiming<T extends Pick<Supplement, "timing" | "name">>(items: readonly T[]) {
  return SUPPLEMENT_TIMINGS.flatMap((timing) => {
    const group = items.filter((s) => s.timing === timing).sort((a, b) => a.name.localeCompare(b.name))
    return group.length ? [{ timing, label: TIMING_LABELS[timing], items: group }] : []
  })
}
