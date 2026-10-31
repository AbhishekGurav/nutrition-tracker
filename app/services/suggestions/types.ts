import type { Macros } from "~/domain/schemas"

/**
 * A guess at what the user is describing. `per100g` is always present so the
 * UI can rescale; `grams` is set when the query included an amount.
 */
export interface MacroSuggestion {
  name: string
  per100g: Macros
  grams?: number
  servingLabel?: string
  /** 0..1, how sure the provider is that this is the right food. */
  confidence: number
  /** Where it came from, e.g. "library", "my foods", "ai". Shown to users. */
  source: string
  /** Set when the suggestion maps to a stored food. */
  foodId?: string
}

export interface SuggestOptions {
  limit?: number
  signal?: AbortSignal
}

/**
 * Pluggable source of macro suggestions. The app ships a local fuzzy matcher;
 * an AI-backed provider can implement the same interface and be passed to
 * <SuggestionProvider provider={...}> without any UI changes.
 */
export interface MacroSuggestionProvider {
  readonly id: string
  readonly label: string
  suggest(query: string, options?: SuggestOptions): Promise<MacroSuggestion[]>
}
