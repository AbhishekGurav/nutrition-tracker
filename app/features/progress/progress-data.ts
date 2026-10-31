import { useLiveQuery } from "dexie-react-hooks"

import { repositories } from "~/data/repositories"
import { lastNDays, todayKey, type DateKey } from "~/domain/dates"
import { dailyTotals, nutritionSeries } from "~/domain/progress"
import type { DayType, Macros } from "~/domain/schemas"

/**
 * Daily kcal/protein vs the right target for each day (training or rest),
 * for the last `days` days.
 */
export function useNutritionSeries(days: number) {
  return useLiveQuery(async () => {
    const end = todayKey()
    const keys = lastNDays(end, days)
    const start = keys[0]
    const [entries, metas, sessions, targets] = await Promise.all([
      repositories.foodLog.byRange(start, end),
      repositories.dayMeta.byRange(start, end),
      repositories.sessions.byRange(start, end),
      repositories.targets.get(),
    ])
    const dayType = new Map<DateKey, DayType>()
    for (const s of sessions) dayType.set(s.date, "training")
    for (const m of metas) if (m.dayType) dayType.set(m.date, m.dayType)
    const targetFor = (d: DateKey): Macros | undefined => targets?.[dayType.get(d) ?? "rest"]
    // Today isn't finished; leave it out so averages aren't dragged down.
    const complete = keys.filter((k) => k !== end)
    return nutritionSeries(complete.length ? complete : keys, dailyTotals(entries), targetFor)
  }, [days])
}
