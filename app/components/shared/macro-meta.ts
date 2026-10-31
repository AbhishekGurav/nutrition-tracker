import type { MacroKey } from "~/domain/schemas"

export interface MacroMeta {
  label: string
  short: string
  unit: "g" | "kcal"
  /** Spoken unit for screen readers. */
  spokenUnit: string
  /** Tailwind classes using the semantic macro tokens from app.css. */
  bg: string
  text: string
  stroke: string
}

export const MACRO_META: Record<MacroKey, MacroMeta> = {
  kcal: {
    label: "Calories",
    short: "kcal",
    unit: "kcal",
    spokenUnit: "calories",
    bg: "bg-macro-kcal",
    text: "text-macro-kcal",
    stroke: "stroke-macro-kcal",
  },
  protein: {
    label: "Protein",
    short: "P",
    unit: "g",
    spokenUnit: "grams",
    bg: "bg-macro-protein",
    text: "text-macro-protein",
    stroke: "stroke-macro-protein",
  },
  carbs: {
    label: "Carbs",
    short: "C",
    unit: "g",
    spokenUnit: "grams",
    bg: "bg-macro-carbs",
    text: "text-macro-carbs",
    stroke: "stroke-macro-carbs",
  },
  fat: {
    label: "Fat",
    short: "F",
    unit: "g",
    spokenUnit: "grams",
    bg: "bg-macro-fat",
    text: "text-macro-fat",
    stroke: "stroke-macro-fat",
  },
}

export const GRAM_MACROS = ["protein", "carbs", "fat"] as const
