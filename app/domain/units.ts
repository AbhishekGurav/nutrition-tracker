import type { UnitSystem } from "~/domain/schemas"

export const KG_PER_LB = 0.45359237
export const CM_PER_IN = 2.54

export type WeightUnit = "kg" | "lb"

export function weightUnitFor(system: UnitSystem): WeightUnit {
  return system === "imperial" ? "lb" : "kg"
}

export function kgToLb(kg: number) {
  return kg / KG_PER_LB
}

export function lbToKg(lb: number) {
  return lb * KG_PER_LB
}

export function round(value: number, decimals = 0) {
  const f = 10 ** decimals
  return Math.round((value + Number.EPSILON) * f) / f
}

/** Round to the nearest multiple of `increment` (e.g. 2.5 kg plates). */
export function roundToIncrement(value: number, increment: number) {
  if (increment <= 0) return value
  return round(Math.round(value / increment) * increment, 4)
}

/** Smallest practical loading jump per unit (pair of smallest common plates). */
export function plateIncrement(unit: WeightUnit) {
  return unit === "lb" ? 5 : 2.5
}

/** kg (storage) -> display unit, rounded to 0.1 to hide float noise. */
export function toDisplayWeight(kg: number, unit: WeightUnit) {
  return round(unit === "lb" ? kgToLb(kg) : kg, 1)
}

/** Display unit -> kg (storage). Not rounded, so round-trips are stable. */
export function fromDisplayWeight(value: number, unit: WeightUnit) {
  return unit === "lb" ? lbToKg(value) : value
}

export function formatWeight(kg: number, unit: WeightUnit, decimals = 1) {
  const v = round(unit === "lb" ? kgToLb(kg) : kg, decimals)
  return `${v.toLocaleString(undefined, { maximumFractionDigits: decimals })} ${unit}`
}

export function cmToFeetInches(cm: number) {
  const totalIn = cm / CM_PER_IN
  let feet = Math.floor(totalIn / 12)
  let inches = round(totalIn - feet * 12, 0)
  if (inches === 12) {
    feet += 1
    inches = 0
  }
  return { feet, inches }
}

export function feetInchesToCm(feet: number, inches: number) {
  return (feet * 12 + inches) * CM_PER_IN
}
