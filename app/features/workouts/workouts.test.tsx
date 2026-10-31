import { beforeEach, describe, expect, it } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"

import { db } from "~/data/db"
import { repositories } from "~/data/repositories"
import { buildSeedExercises, ensureSeeded, seedExerciseId } from "~/data/seed"
import { findSessionPRs, historyBests } from "~/domain/strength"
import { useDayType } from "~/hooks/use-data"
import {
  addExercise,
  addSet,
  finishSession,
  moveItem,
  removeSet,
  startSession,
  updateSet,
} from "~/features/workouts/session-service"
import { filterExercises } from "~/features/workouts/workout-meta"

const bench = seedExerciseId("barbell-bench-press")
const squat = seedExerciseId("back-squat")

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await ensureSeeded(db)
})

describe("exercise filters", () => {
  it("matches primary or secondary muscle and equipment", () => {
    const all = buildSeedExercises()
    const triceps = filterExercises(all, { muscle: "triceps", equipment: "all" })
    expect(triceps.some((e) => e.id === bench)).toBe(true) // secondary
    expect(triceps.some((e) => e.id === squat)).toBe(false)
    const cableTriceps = filterExercises(all, { muscle: "triceps", equipment: "cable" })
    expect(cableTriceps.every((e) => e.equipment === "cable")).toBe(true)
    expect(cableTriceps.length).toBeGreaterThan(0)
  })
})

describe("templates", () => {
  it("persists exercise order after reordering", async () => {
    const t = await repositories.templates.create({
      name: "Push A",
      exercises: [
        { exerciseId: bench, targetSets: 3, repMin: 5, repMax: 8 },
        { exerciseId: squat, targetSets: 3, repMin: 5, repMax: 8 },
      ],
    })
    await repositories.templates.update(t.id, { exercises: moveItem(t.exercises, 1, -1) })
    const saved = await repositories.templates.get(t.id)
    expect(saved?.exercises.map((e) => e.exerciseId)).toEqual([squat, bench])
    expect(moveItem([1, 2], 0, -1)).toEqual([1, 2])
  })
})

describe("sessions", () => {
  it("prefills from the last session, supports set CRUD and drops undone sets on finish", async () => {
    const template = await repositories.templates.create({
      name: "Push A",
      exercises: [{ exerciseId: bench, targetSets: 3, repMin: 6, repMax: 10 }],
    })
    const first = await startSession(template, "2026-10-01")
    expect(first.exercises[0].sets).toHaveLength(3)
    expect(first.exercises[0].sets[0]).toMatchObject({ reps: 6, weightKg: 0, done: false })

    const row = first.exercises[0].id
    const [s1, s2, s3] = first.exercises[0].sets
    await updateSet(first.id, row, s1.id, { weightKg: 100, reps: 5, done: true })
    await updateSet(first.id, row, s2.id, { weightKg: 100, reps: 5, done: true })
    await removeSet(first.id, row, s3.id)
    await addSet(first.id, row)
    const mid = await repositories.sessions.get(first.id)
    expect(mid?.exercises[0].sets).toHaveLength(3)
    expect(mid?.exercises[0].sets[2]).toMatchObject({ weightKg: 100, reps: 5, done: false })
    await finishSession(first.id)
    const done = await repositories.sessions.get(first.id)
    expect(done?.endedAt).toBeDefined()
    expect(done?.exercises[0].sets).toHaveLength(2)

    const second = await startSession(template, "2026-10-03")
    expect(second.exercises[0].sets.map((s) => [s.weightKg, s.reps, s.done])).toEqual([
      [100, 5, false],
      [100, 5, false],
    ])
    // Adding a brand-new lift mid-session falls back to defaults.
    await addExercise(second.id, squat)
    const withSquat = await repositories.sessions.get(second.id)
    expect(withSquat?.exercises[1].sets).toHaveLength(3)
  })

  it("flags a live PR against earlier sessions", async () => {
    const t = await repositories.templates.create({ name: "Bench", exercises: [{ exerciseId: bench, targetSets: 1, repMin: 5, repMax: 5 }] })
    const a = await startSession(t, "2026-10-01")
    await updateSet(a.id, a.exercises[0].id, a.exercises[0].sets[0].id, { weightKg: 100, reps: 5, done: true })
    await finishSession(a.id)
    const b = await startSession(t, "2026-10-03")
    const set = b.exercises[0].sets[0]
    await updateSet(b.id, b.exercises[0].id, set.id, { weightKg: 105, reps: 5, done: true })
    const live = (await repositories.sessions.get(b.id))!
    const history = (await repositories.sessions.all()).filter((s) => s.id !== b.id)
    const prs = findSessionPRs(live.exercises[0].sets, historyBests(history, bench))
    expect(prs.get(set.id)).toEqual(["e1rm", "weight"])
  })

  it("makes the day a training day unless overridden", async () => {
    const { result } = renderHook(() => useDayType("2026-10-05"))
    await waitFor(() => expect(result.current?.dayType).toBe("rest"))
    await startSession(undefined, "2026-10-05")
    await waitFor(() => expect(result.current).toMatchObject({ dayType: "training", hasWorkout: true, isOverride: false }))
    await repositories.dayMeta.setDayType("2026-10-05", "rest")
    await waitFor(() => expect(result.current).toMatchObject({ dayType: "rest", isOverride: true }))
  })
})
