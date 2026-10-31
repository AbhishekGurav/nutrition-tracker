/** Local calendar day as YYYY-MM-DD. All day-bucketed data is keyed by this. */
export type DateKey = string

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayKey(now: Date = new Date()): DateKey {
  return toDateKey(now)
}

/** True for a well-formed key that names a real calendar date. */
export function isDateKey(value: unknown): value is DateKey {
  if (typeof value !== "string") return false
  const m = DATE_KEY_RE.exec(value)
  if (!m) return false
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return toDateKey(d) === value
}

/** Local midnight for the key. */
export function parseDateKey(key: DateKey): Date {
  const m = DATE_KEY_RE.exec(key)
  if (!m) throw new Error(`Invalid date key: ${key}`)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** Calendar-day arithmetic; safe across DST changes. */
export function addDays(key: DateKey, days: number): DateKey {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: DateKey, b: DateKey): number {
  const ms = parseDateKey(b).getTime() - parseDateKey(a).getTime()
  return Math.round(ms / 86_400_000)
}

/** Inclusive list of keys from start to end. Empty if end < start. */
export function dateRange(start: DateKey, end: DateKey): DateKey[] {
  const out: DateKey[] = []
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k)
  return out
}

/** Keys for the last `days` days ending at `end` (inclusive). */
export function lastNDays(end: DateKey, days: number): DateKey[] {
  return dateRange(addDays(end, -(days - 1)), end)
}

/** "Today", "Yesterday", "Tomorrow" or e.g. "Mon, Oct 27". */
export function formatDayLabel(key: DateKey, today: DateKey = todayKey()) {
  const diff = daysBetween(today, key)
  if (diff === 0) return "Today"
  if (diff === -1) return "Yesterday"
  if (diff === 1) return "Tomorrow"
  const d = parseDateKey(key)
  const sameYear = key.slice(0, 4) === today.slice(0, 4)
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  })
}

/** Short axis label such as "Oct 27". */
export function formatShortDate(key: DateKey) {
  return parseDateKey(key).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

/** Duration like "1h 05m" or "42m". */
export function formatDuration(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${pad(m)}m` : `${m}m`
}

/** Clock-style timer like "1:05" or "1:02:09". */
export function formatTimer(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`
}
