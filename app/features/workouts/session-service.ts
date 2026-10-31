import { newId, repositories } from "~/data/repositories"
import type { SessionExercise, SetEntry, WorkoutSession, WorkoutTemplate } from "~/domain/schemas"
import { todayKey } from "~/domain/dates"
import { lastPerformance } from "~/domain/strength"

export function newSet(p: Partial<SetEntry> = {}): SetEntry {
  return { id: newId(), weightKg: 0, reps: 0, isWarmup: false, done: false, ...p }
}

/**
 * Sets for an exercise in a new session: repeat last time's sets (not yet
 * done) so the user only adjusts, or fall back to the template's targets.
 */
export function prefillSets(
  history: readonly WorkoutSession[],
  exerciseId: string,
  target: { sets: number; reps: number } = { sets: 3, reps: 8 },
  excludeSessionId?: string
): SetEntry[] {
  const last = lastPerformance(history, exerciseId, excludeSessionId)
  if (last && last.length > 0) {
    return last.map((s) => newSet({ weightKg: s.weightKg, reps: s.reps, isWarmup: s.isWarmup }))
  }
  return Array.from({ length: target.sets }, () => newSet({ reps: target.reps }))
}

export function buildSessionExercise(
  history: readonly WorkoutSession[],
  exerciseId: string,
  target?: { sets: number; reps: number },
  excludeSessionId?: string
): SessionExercise {
  return { id: newId(), exerciseId, sets: prefillSets(history, exerciseId, target, excludeSessionId) }
}

/** Create and persist a new in-progress session. */
export async function startSession(template?: WorkoutTemplate, date = todayKey()) {
  const history = (await repositories.sessions.all()).filter((s) => s.endedAt !== undefined)
  const exercises = (template?.exercises ?? []).map((te) =>
    buildSessionExercise(history, te.exerciseId, { sets: te.targetSets, reps: te.repMin })
  )
  return repositories.sessions.create({
    date,
    name: template?.name ?? "Workout",
    templateId: template?.id,
    startedAt: Date.now(),
    exercises,
  })
}

/** Read-modify-write helper so every mutation works on the latest copy. */
export async function mutateSession(id: string, fn: (s: WorkoutSession) => Partial<WorkoutSession>) {
  const current = await repositories.sessions.get(id)
  if (!current) return undefined
  const { id: _id, createdAt: _c, updatedAt: _u, ...patch } = { ...current, ...fn(current) }
  return repositories.sessions.update(id, patch)
}

export function mapExercise(
  s: WorkoutSession,
  exerciseRowId: string,
  fn: (e: SessionExercise) => SessionExercise
): Partial<WorkoutSession> {
  return { exercises: s.exercises.map((e) => (e.id === exerciseRowId ? fn(e) : e)) }
}

export const updateSet = (sessionId: string, exerciseRowId: string, setId: string, patch: Partial<SetEntry>) =>
  mutateSession(sessionId, (s) =>
    mapExercise(s, exerciseRowId, (e) => ({
      ...e,
      sets: e.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
    }))
  )

/** Adds a set copying the previous one's weight and reps. */
export const addSet = (sessionId: string, exerciseRowId: string) =>
  mutateSession(sessionId, (s) =>
    mapExercise(s, exerciseRowId, (e) => {
      const last = e.sets.at(-1)
      return { ...e, sets: [...e.sets, newSet({ weightKg: last?.weightKg ?? 0, reps: last?.reps ?? 8 })] }
    })
  )

export const removeSet = (sessionId: string, exerciseRowId: string, setId: string) =>
  mutateSession(sessionId, (s) =>
    mapExercise(s, exerciseRowId, (e) => ({ ...e, sets: e.sets.filter((set) => set.id !== setId) }))
  )

export async function addExercise(sessionId: string, exerciseId: string) {
  const history = (await repositories.sessions.all()).filter((s) => s.endedAt !== undefined)
  return mutateSession(sessionId, (s) => ({
    exercises: [...s.exercises, buildSessionExercise(history, exerciseId, undefined, sessionId)],
  }))
}

export const removeExercise = (sessionId: string, exerciseRowId: string) =>
  mutateSession(sessionId, (s) => ({ exercises: s.exercises.filter((e) => e.id !== exerciseRowId) }))

export function moveItem<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta
  if (target < 0 || target >= items.length) return [...items]
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export const moveExercise = (sessionId: string, index: number, delta: -1 | 1) =>
  mutateSession(sessionId, (s) => ({ exercises: moveItem(s.exercises, index, delta) }))

/** Finish: drop sets never marked done and stamp the end time. */
export const finishSession = (sessionId: string) =>
  mutateSession(sessionId, (s) => ({
    endedAt: Date.now(),
    exercises: s.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((set) => set.done) }))
      .filter((e) => e.sets.length > 0),
  }))
