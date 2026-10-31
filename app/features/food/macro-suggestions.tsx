import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { SparklesIcon } from "@hugeicons/core-free-icons"

import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { ListRow, RowList } from "~/components/shared/list-row"
import { MacroChips } from "~/components/shared/macro-display"
import { scaleMacros } from "~/domain/macros"
import { useSuggestionProvider } from "~/services/suggestions/context"
import type { MacroSuggestion } from "~/services/suggestions/types"

interface MacroSuggestionsProps {
  /** Free text such as "oats 80g" or "2 eggs". */
  query: string
  onPick: (suggestion: MacroSuggestion) => void
  /** Grams to preview when the query has no amount. */
  fallbackGrams?: number
}

export function confidenceLabel(confidence: number) {
  return `${Math.round(confidence * 100)}% match`
}

/**
 * "Suggest macros" button plus a short pick list. Suggestions only fill the
 * form; the user can still edit every value before saving.
 */
export function MacroSuggestions({ query, onPick, fallbackGrams = 100 }: MacroSuggestionsProps) {
  const provider = useSuggestionProvider()
  const [results, setResults] = React.useState<MacroSuggestion[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const canSuggest = query.trim().length >= 2

  const run = async () => {
    setLoading(true)
    try {
      setResults(await provider.suggest(query, { limit: 4 }))
    } finally {
      setLoading(false)
    }
  }

  // Stale results are misleading once the text changes.
  React.useEffect(() => setResults(null), [query])

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" onPress={() => void run()} isDisabled={!canSuggest || loading} className="w-fit">
        <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} data-icon="inline-start" />
        {loading ? "Finding…" : "Suggest macros"}
      </Button>
      {results !== null ? (
        results.length === 0 ? (
          <p className="text-xs text-muted-foreground">No close matches. Enter the values from the label instead.</p>
        ) : (
          <div className="flex flex-col gap-1 rounded-lg border p-1" aria-label="Suggestions" role="group">
            <p className="px-2 pt-1 text-[0.6875rem] text-muted-foreground">
              From {provider.label.toLowerCase()}. Tap one to fill the form.
            </p>
            <RowList>
              {results.map((s) => {
                const grams = s.grams ?? fallbackGrams
                return (
                  <ListRow
                    key={`${s.foodId ?? s.name}-${s.source}`}
                    title={s.name}
                    pressLabel={`Use ${s.name}, ${Math.round(grams)} grams, ${confidenceLabel(s.confidence)}`}
                    subtitle={
                      <span className="flex flex-col gap-0.5">
                        <span>
                          {s.servingLabel ? `${s.servingLabel} · ` : ""}
                          {Math.round(grams)} g · {s.source}
                        </span>
                        <MacroChips macros={scaleMacros(s.per100g, grams)} />
                      </span>
                    }
                    trailing={
                      <Badge variant={s.confidence >= 0.7 ? "default" : "outline"}>{confidenceLabel(s.confidence)}</Badge>
                    }
                    onPress={() => {
                      onPick(s)
                      setResults(null)
                    }}
                  />
                )
              })}
            </RowList>
          </div>
        )
      ) : null}
    </div>
  )
}
