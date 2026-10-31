import type { SetEntry, WorkoutSession } from "~/domain/schemas"

/** Epley estimated one-rep max. 0 reps -> 0, 1 rep -> the weight itself. */
export function epley1RM(weightKg: number, reps: number) {
  if (reps <= 0 || weightKg <= 0) return 0
  if (reps === 1) return weightKg
  return weightKg * (1 + reps / 30)
}

/** Sets that count: completed, not warmups, at least one rep. */
export function isWorkingSet(set: SetEntry) {
  return set.done && !set.isWarmup && set.reps > 0
}

export function workingSets(sets: readonly SetEntry[]) {
  return sets.filter(isWorkingSet)
}

export function bestSetByE1RM(sets: readonly SetEntry[]): SetEntry | undefined {
  let best: SetEntry | undefined
  let bestValue = 0
  for (const s of workingSets(sets)) {
    const v = epley1RM(s.weightKg, s.reps)
    if (v > bestValue) {
      best = s
      bestValue = v
    }
  }
  return best
}

export function setVolume(set: SetEntry) {
  return set.weightKg * set.reps
}

/** Tonnage of working sets (kg). */
export function volume(sets: readonly SetEntry[]) {
  return workingSets(sets).reduce((sum, s) => sum + setVolume(s), 0)
}

export function sessionVolume(session: Pick<WorkoutSession, "exercises">) {
  return session.exercises.reduce((sum, e) => sum + volume(e.sets), 0)
}

export function sessionWorkingSetCount(session: Pick<WorkoutSession, "exercises">) {
  return session.exercises.reduce((n, e) => n + workingSets(e.sets).length, 0)
}

export interface ExerciseBests {
  e1rm: number
  weightKg: number
}

export function bestsFromSets(sets: readonly SetEntry[]): ExerciseBests {
  let e1rm = 0
  let weightKg = 0
  for (const s of workingSets(sets)) {
    e1rm = Math.max(e1rm, epley1RM(s.weightKg, s.reps))
    weightKg = Math.max(weightKg, s.weightKg)
  }
  return { e1rm, weightKg }
}

export type PRKind = "e1rm" | "weight"

/**
 * PRs within one exercise of one session, compared to prior history.
 * Only the single best set per kind is flagged, so a session never shows
 * a wall of badges. No history means no PR (a first session isn't a record).
 */
export function findSessionPRs(
  sessionSets: readonly SetEntry[],
  history: ExerciseBests | undefined
): Map<string, PRKind[]> {
  const result = new Map<string, PRKind[]>()
  if (!history || (history.e1rm <= 0 && history.weightKg <= 0)) return result
  const work = workingSets(sessionSets)
  const add = (id: string, kind: PRKind) =>
    result.set(id, [...(result.get(id) ?? []), kind])

  const bestE = bestSetByE1RM(work)
  if (bestE && epley1RM(bestE.weightKg, bestE.reps) > history.e1rm + 1e-9) {
    add(bestE.id, "e1rm")
  }
  let heaviest: SetEntry | undefined
  for (const s of work) if (!heaviest || s.weightKg > heaviest.weightKg) heaviest = s
  if (heaviest && heaviest.weightKg > history.weightKg + 1e-9) add(heaviest.id, "weight")
  return result
}

/**
 * Walk sessions oldest-first, tracking per-exercise bests, and report the
 * number of exercises with a PR in each session. Unfinished sessions are skipped.
 */
export function prCountsBySession(
  sessions: readonly WorkoutSession[]
): Map<string, number> {
  const sorted = [...sessions]
    .filter((s) => s.endedAt !== undefined)
    .sort((a, b) => a.startedAt - b.startedAt)
  const bests = new Map<string, ExerciseBests>()
  const counts = new Map<string, number>()
  for (const session of sorted) {
    let count = 0
    for (const ex of session.exercises) {
      const prior = bests.get(ex.exerciseId)
      if (findSessionPRs(ex.sets, prior).size > 0) count++
      const current = bestsFromSets(ex.sets)
      bests.set(ex.exerciseId, {
        e1rm: Math.max(prior?.e1rm ?? 0, current.e1rm),
        weightKg: Math.max(prior?.weightKg ?? 0, current.weightKg),
      })
    }
    counts.set(session.id, count)
  }
  return counts
}

/** Bests for one exercise across sessions, optionally excluding one session. */
export function historyBests(
  sessions: readonly WorkoutSession[],
  exerciseId: string,
  excludeSessionId?: string
): ExerciseBests | undefined {
  let found = false
  let e1rm = 0
  let weightKg = 0
  for (const s of sessions) {
    if (s.id === excludeSessionId) continue
    for (const ex of s.exercises) {
      if (ex.exerciseId !== exerciseId) continue
      const b = bestsFromSets(ex.sets)
      if (b.e1rm > 0) found = true
      e1rm = Math.max(e1rm, b.e1rm)
      weightKg = Math.max(weightKg, b.weightKg)
    }
  }
  return found ? { e1rm, weightKg } : undefined
}

/** Most recent completed sets for an exercise, used to prefill a new session. */
export function lastPerformance(
  sessions: readonly WorkoutSession[],
  exerciseId: string,
  excludeSessionId?: string
): SetEntry[] | undefined {
  const sorted = [...sessions]
    .filter((s) => s.id !== excludeSessionId)
    .sort((a, b) => b.startedAt - a.startedAt)
  for (const s of sorted) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId)
    if (ex && ex.sets.some((set) => set.done)) {
      return ex.sets.filter((set) => set.done)
    }
  }
  return undefined
}
