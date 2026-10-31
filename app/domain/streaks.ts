import type { Supplement, SupplementLog } from "~/domain/schemas"
import { addDays, type DateKey } from "~/domain/dates"

type ScheduleInfo = Pick<Supplement, "id" | "active" | "startDate">

/** Active supplements count from their start date onward. */
export function scheduledOn<T extends ScheduleInfo>(supplements: readonly T[], date: DateKey) {
  return supplements.filter((s) => s.active && s.startDate <= date)
}

/** date -> set of supplement ids taken that day. */
export function indexLogs(logs: readonly Pick<SupplementLog, "date" | "supplementId">[]) {
  const map = new Map<DateKey, Set<string>>()
  for (const log of logs) {
    let set = map.get(log.date)
    if (!set) map.set(log.date, (set = new Set()))
    set.add(log.supplementId)
  }
  return map
}

export interface DayStatus {
  taken: number
  total: number
  complete: boolean
}

export function dayStatus(
  supplements: readonly ScheduleInfo[],
  takenIds: ReadonlySet<string> | undefined,
  date: DateKey
): DayStatus {
  const due = scheduledOn(supplements, date)
  const taken = due.filter((s) => takenIds?.has(s.id)).length
  return { taken, total: due.length, complete: due.length > 0 && taken === due.length }
}

/**
 * Consecutive fully-completed days ending today. If today isn't complete yet
 * it doesn't break the streak; counting starts from yesterday instead.
 */
export function currentStreak(
  supplements: readonly ScheduleInfo[],
  logs: readonly Pick<SupplementLog, "date" | "supplementId">[],
  today: DateKey
) {
  const byDate = indexLogs(logs)
  let day = today
  if (!dayStatus(supplements, byDate.get(today), today).complete) {
    day = addDays(today, -1)
  }
  let streak = 0
  // Hard stop so a corrupt start date can't loop forever.
  for (let i = 0; i < 3650; i++) {
    if (!dayStatus(supplements, byDate.get(day), day).complete) break
    streak++
    day = addDays(day, -1)
  }
  return streak
}

/** Percentage of scheduled doses taken across the given days (0-100). */
export function adherence(
  supplements: readonly ScheduleInfo[],
  logs: readonly Pick<SupplementLog, "date" | "supplementId">[],
  days: readonly DateKey[]
) {
  const byDate = indexLogs(logs)
  let taken = 0
  let total = 0
  for (const d of days) {
    const s = dayStatus(supplements, byDate.get(d), d)
    taken += s.taken
    total += s.total
  }
  return total === 0 ? 0 : Math.round((taken / total) * 100)
}
