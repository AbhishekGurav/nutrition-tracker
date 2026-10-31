import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { ProgressPage, type ProgressTab } from "~/features/progress/progress-page"

const TABS: readonly ProgressTab[] = ["body", "nutrition", "strength"]

export const Route = createFileRoute("/progress")({
  validateSearch: (search: Record<string, unknown>): { tab?: ProgressTab; exercise?: string } => ({
    tab: TABS.find((t) => t === search.tab),
    exercise: typeof search.exercise === "string" && search.exercise ? search.exercise : undefined,
  }),
  component: ProgressRoute,
})

function ProgressRoute() {
  const { tab, exercise } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <ProgressPage
      tab={tab ?? "body"}
      exerciseId={exercise}
      onChange={(next) =>
        void navigate({
          search: {
            tab: next.tab === "body" ? undefined : next.tab,
            exercise: next.tab === "strength" ? next.exercise : undefined,
          },
          replace: true,
        })
      }
    />
  )
}
