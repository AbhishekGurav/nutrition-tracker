import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { FoodPage, type FoodTab } from "~/features/food/food-page"

const TABS: readonly FoodTab[] = ["library", "mine", "meals"]

export const Route = createFileRoute("/food/")({
  validateSearch: (search: Record<string, unknown>): { tab?: FoodTab } => {
    const tab = TABS.find((t) => t === search.tab)
    return tab && tab !== "library" ? { tab } : {}
  },
  component: FoodRoute,
})

function FoodRoute() {
  const { tab } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <FoodPage
      tab={tab ?? "library"}
      onTabChange={(next) => void navigate({ search: next === "library" ? {} : { tab: next }, replace: true })}
    />
  )
}
