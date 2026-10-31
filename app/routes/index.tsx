import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { isDateKey, todayKey } from "~/domain/dates"
import { TodayPage } from "~/features/today/today-page"

export const Route = createFileRoute("/")({
  // ?date=YYYY-MM-DD selects a past day; omitted means today.
  validateSearch: (search: Record<string, unknown>): { date?: string } =>
    isDateKey(search.date) ? { date: search.date } : {},
  component: TodayRoute,
})

function TodayRoute() {
  const { date } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const day = date ?? todayKey()
  return (
    <TodayPage
      date={day}
      onDateChange={(next) =>
        void navigate({ search: next === todayKey() ? {} : { date: next } })
      }
    />
  )
}
