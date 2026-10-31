import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { isDateKey, todayKey } from "~/domain/dates"
import { SupplementsPage } from "~/features/supplements/supplements-page"

export const Route = createFileRoute("/supplements")({
  validateSearch: (search: Record<string, unknown>): { date?: string } =>
    isDateKey(search.date) ? { date: search.date } : {},
  component: SupplementsRoute,
})

function SupplementsRoute() {
  const { date } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return (
    <SupplementsPage
      date={date ?? todayKey()}
      onDateChange={(next) => void navigate({ search: next === todayKey() ? {} : { date: next } })}
    />
  )
}
