import { KG_PER_LB } from "~/domain/units"

export interface ParsedQuery {
  /** The food description with the amount removed. */
  text: string
  /** Explicit weight in grams, e.g. "200g rice". */
  grams?: number
  /** A count, e.g. "2 eggs" or "1.5 scoops whey". */
  count?: number
  /** Serving word that came with the count ("scoop", "cup", "slice"...). */
  servingWord?: string
}

const MASS_UNITS: Record<string, number> = {
  g: 1,
  gr: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: KG_PER_LB * 1000,
  lbs: KG_PER_LB * 1000,
  ml: 1, // close enough for water-like liquids
}

const SERVING_WORDS = [
  "cup",
  "cups",
  "slice",
  "slices",
  "scoop",
  "scoops",
  "tbsp",
  "tsp",
  "piece",
  "pieces",
  "large",
  "medium",
  "small",
  "can",
  "cans",
  "bar",
  "bars",
  "serving",
  "servings",
  "fillet",
  "fillets",
]

function toNumber(raw: string) {
  if (raw.includes("/")) {
    const [a, b] = raw.split("/").map(Number)
    return b ? a / b : Number.NaN
  }
  return Number(raw.replace(",", "."))
}

// Fractions first so "1/2" isn't read as "1".
const NUM = String.raw`(\d+/\d+|\d+(?:[.,]\d+)?)`

/** Pull an amount out of free text like "oats 80g", "200 g rice", "2 eggs", "1/2 cup rice". */
export function parseQuantity(query: string): ParsedQuery {
  let text = query.trim().toLowerCase()

  const mass = new RegExp(String.raw`${NUM}\s*(${Object.keys(MASS_UNITS).join("|")})\b`).exec(text)
  if (mass) {
    const value = toNumber(mass[1])
    text = (text.slice(0, mass.index) + text.slice(mass.index + mass[0].length)).trim()
    if (Number.isFinite(value) && value > 0) {
      return { text: clean(text), grams: Math.round(value * MASS_UNITS[mass[2]] * 10) / 10 }
    }
  }

  // Leading count: "2 eggs", "1.5 scoops whey", "1/2 cup rice", "3x bacon".
  const count = new RegExp(String.raw`^${NUM}\s*(?:x\s+|x(?=\S))?(.*)$`).exec(text)
  if (count) {
    const value = toNumber(count[1])
    if (Number.isFinite(value) && value > 0) {
      const rest = count[2].trim()
      const first = rest.split(" ")[0]
      if (SERVING_WORDS.includes(first)) {
        return { text: clean(rest.slice(first.length)), count: value, servingWord: first.replace(/s$/, "") }
      }
      return { text: clean(rest), count: value }
    }
  }

  return { text: clean(text) }
}

function clean(text: string) {
  return text.replace(/^(of|x)\s+/, "").replace(/\s+/g, " ").trim()
}
