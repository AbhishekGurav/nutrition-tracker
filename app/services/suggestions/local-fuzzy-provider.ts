import type { Food } from "~/domain/schemas"
import { scoreMatch, tokenize } from "~/lib/search"
import { parseQuantity } from "~/services/suggestions/parse-quantity"
import type { MacroSuggestion, MacroSuggestionProvider, SuggestOptions } from "~/services/suggestions/types"

/**
 * Offline provider: fuzzy-matches the query against the bundled library and
 * the user's own foods, then scales by any amount found in the text.
 */
export class LocalFuzzyProvider implements MacroSuggestionProvider {
  readonly id = "local"
  readonly label = "Food library"

  constructor(private readonly getFoods: () => Promise<Food[]>) {}

  async suggest(query: string, { limit = 5 }: SuggestOptions = {}): Promise<MacroSuggestion[]> {
    const parsed = parseQuantity(query)
    const tokens = tokenize(parsed.text)
    if (tokens.length === 0) return []
    // Best case per token is an exact first-word hit (3 + 1); plus the length bonus.
    const maxScore = tokens.length * 4 + 1
    const foods = await this.getFoods()

    return foods
      .map((food) => {
        let score = scoreMatch(`${food.name} ${food.brand ?? ""}`, parsed.text)
        // The user's own foods are more likely what they mean.
        if (score > 0 && food.source === "user") score += 0.5
        return { food, score }
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ food, score }) => {
        const amount = this.resolveAmount(food, parsed)
        return {
          name: food.name,
          per100g: food.per100g,
          grams: amount?.grams,
          servingLabel: amount?.servingLabel,
          confidence: Math.min(1, score / maxScore),
          source: food.source === "user" ? "My foods" : "Library",
          foodId: food.id,
        }
      })
  }

  private resolveAmount(food: Food, parsed: ReturnType<typeof parseQuantity>) {
    if (parsed.grams !== undefined) return { grams: parsed.grams }
    if (parsed.count === undefined) return undefined
    const serving =
      (parsed.servingWord && food.servings.find((s) => s.label.toLowerCase().includes(parsed.servingWord!))) ||
      food.servings[0]
    if (!serving) return { grams: parsed.count * 100 }
    return { grams: Math.round(serving.grams * parsed.count * 10) / 10, servingLabel: serving.label }
  }
}
