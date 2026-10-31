import * as React from "react"

import { repositories } from "~/data/repositories"
import { LocalFuzzyProvider } from "~/services/suggestions/local-fuzzy-provider"
import type { MacroSuggestionProvider } from "~/services/suggestions/types"

const defaultProvider = new LocalFuzzyProvider(() => repositories.foods.all())

const SuggestionContext = React.createContext<MacroSuggestionProvider>(defaultProvider)

/** Swap the macro suggestion source app-wide (e.g. an AI provider). */
export function SuggestionProvider({
  provider,
  children,
}: {
  provider: MacroSuggestionProvider
  children: React.ReactNode
}) {
  return <SuggestionContext.Provider value={provider}>{children}</SuggestionContext.Provider>
}

export function useSuggestionProvider() {
  return React.useContext(SuggestionContext)
}
