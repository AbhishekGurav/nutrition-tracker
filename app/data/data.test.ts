import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { AppDB } from "~/data/db"
import { createDexieRepositories } from "~/data/repositories/dexie"
import type { Repositories } from "~/data/repositories/types"
import { buildSeedExercises, buildSeedFoods, ensureSeeded, seedFoodId } from "~/data/seed"
import type { NewEntity, Food } from "~/domain/schemas"

let db: AppDB
let repos: Repositories
let n = 0

beforeEach(async () => {
  db = new AppDB(`test-${++n}-${Math.random()}`)
  await db.open()
  repos = createDexieRepositories(db)
})

afterEach(async () => {
  await db.delete()
})

const food = (p: Partial<NewEntity<Food>> = {}): NewEntity<Food> => ({
  name: "Chicken",
  per100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  servings: [],
  source: "user",
  ...p,
})

describe("seed data", () => {
  it("is valid and sized as expected", () => {
    const foods = buildSeedFoods()
    const exercises = buildSeedExercises()
    expect(foods.length).toBeGreaterThanOrEqual(180)
    expect(exercises.length).toBeGreaterThanOrEqual(80)
    expect(new Set(foods.map((f) => f.id)).size).toBe(foods.length)
    expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length)
  })

  it("seeds once per version", async () => {
    expect((await ensureSeeded(db)).seeded).toBe(true)
    const count = await db.foods.count()
    expect((await ensureSeeded(db)).seeded).toBe(false)
    expect(await db.foods.count()).toBe(count)
    expect(await db.exercises.count()).toBeGreaterThanOrEqual(80)
  })
})

describe("repositories", () => {
  it("creates, updates and removes with timestamps", async () => {
    const created = await repos.foods.create(food())
    expect(created.id).toMatch(/[0-9a-f-]{36}/)
    expect(created.createdAt).toBe(created.updatedAt)
    const updated = await repos.foods.update(created.id, { name: "Chicken thigh" })
    expect(updated?.name).toBe("Chicken thigh")
    expect(updated?.createdAt).toBe(created.createdAt)
    expect(await repos.foods.update("missing", { name: "x" })).toBeUndefined()
    await repos.foods.remove(created.id)
    expect(await repos.foods.get(created.id)).toBeUndefined()
  })

  it("keeps variations linked and detaches them when the base is deleted", async () => {
    const base = await repos.foods.create(food())
    const variation = await repos.foods.create(food({ name: "Chicken, marinated", baseFoodId: base.id }))
    expect((await repos.foods.variationsOf(base.id)).map((f) => f.id)).toEqual([variation.id])
    const meal = await repos.meals.create({ name: "Lunch", items: [{ foodId: base.id, grams: 150 }] })
    await repos.foods.remove(base.id)
    expect((await repos.foods.get(variation.id))?.baseFoodId).toBeUndefined()
    expect((await repos.meals.get(meal.id))?.items).toEqual([])
  })

  it("refuses to delete library foods", async () => {
    await ensureSeeded(db)
    await expect(repos.foods.remove(seedFoodId("banana"))).rejects.toThrow()
  })

  it("queries the food log by date and returns recent foods", async () => {
    const a = await repos.foods.create(food({ name: "A" }))
    const b = await repos.foods.create(food({ name: "B" }))
    const macros = { kcal: 100, protein: 10, carbs: 10, fat: 1 }
    await repos.foodLog.addMany([
      { date: "2026-10-01", slot: "breakfast", foodId: a.id, name: "A", grams: 100, macros },
      { date: "2026-10-02", slot: "lunch", foodId: b.id, name: "B", grams: 100, macros },
      { date: "2026-10-02", slot: "lunch", foodId: a.id, name: "A", grams: 50, macros },
      { date: "2026-10-03", slot: "lunch", name: "Quick add", grams: 0, macros },
    ])
    expect(await repos.foodLog.byDate("2026-10-02")).toHaveLength(2)
    expect(await repos.foodLog.byRange("2026-10-01", "2026-10-02")).toHaveLength(3)
    expect(await repos.foodLog.recentFoodIds(10)).toEqual([a.id, b.id])
  })

  it("toggles supplement logs idempotently and cascades deletes", async () => {
    const s = await repos.supplements.create({
      name: "Creatine",
      dose: 5,
      unit: "g",
      timing: "morning",
      active: true,
      startDate: "2026-10-01",
    })
    await repos.supplementLogs.setTaken("2026-10-01", s.id, true)
    await repos.supplementLogs.setTaken("2026-10-01", s.id, true)
    expect(await repos.supplementLogs.byDate("2026-10-01")).toHaveLength(1)
    await repos.supplementLogs.setTaken("2026-10-01", s.id, false)
    expect(await repos.supplementLogs.byDate("2026-10-01")).toHaveLength(0)
    await repos.supplementLogs.setTaken("2026-10-02", s.id, true)
    await repos.supplements.remove(s.id)
    expect(await repos.supplementLogs.all()).toHaveLength(0)
  })

  it("upserts one body weight per day and finds the active session", async () => {
    await repos.bodyWeights.upsert("2026-10-01", 80)
    await repos.bodyWeights.upsert("2026-10-01", 81)
    await repos.bodyWeights.upsert("2026-10-02", 80.5)
    expect(await repos.bodyWeights.all()).toHaveLength(2)
    expect((await repos.bodyWeights.latest())?.kg).toBe(80.5)

    await repos.sessions.create({ date: "2026-10-01", name: "Done", startedAt: 1, endedAt: 2, exercises: [] })
    const open = await repos.sessions.create({ date: "2026-10-02", name: "Open", startedAt: 3, exercises: [] })
    expect((await repos.sessions.active())?.id).toBe(open.id)
  })

  it("round-trips a backup", async () => {
    await ensureSeeded(db)
    await repos.profile.save({
      sex: "male",
      birthYear: 1995,
      heightCm: 180,
      weightKg: 80,
      unitSystem: "metric",
      activityLevel: "moderate",
      goal: "maintain",
      proteinPerKg: 2,
      trainingDaysPerWeek: 4,
    })
    await repos.foods.create(food({ name: "My food" }))
    await repos.dayMeta.setDayType("2026-10-01", "training")
    const backup = await repos.backup.exportAll()
    const json = JSON.parse(JSON.stringify(backup))

    await repos.foods.create(food({ name: "Added after export" }))
    await repos.backup.importAll(json)
    const names = (await repos.foods.all()).map((f) => f.name)
    expect(names).toContain("My food")
    expect(names).not.toContain("Added after export")
    expect((await repos.profile.get())?.heightCm).toBe(180)
    expect((await repos.dayMeta.get("2026-10-01"))?.dayType).toBe("training")
    await expect(repos.backup.importAll({ ...json, format: "nope" })).rejects.toThrow()
  })

  it("stores one body-composition reading per day per method and backs them up", async () => {
    await repos.bodyComps.upsert("2026-10-01", "scale", { weightKg: 80, bodyFatPct: 20, muscleMassKg: 60 })
    await repos.bodyComps.upsert("2026-10-01", "scale", { weightKg: 80.2, bodyFatPct: 19.8 })
    await repos.bodyComps.upsert("2026-10-01", "tape", { weightKg: 80, bodyFatPct: 18, waistCm: 85, neckCm: 38 })
    const all = await repos.bodyComps.all()
    expect(all).toHaveLength(2)
    const scale = all.find((c) => c.method === "scale")!
    // Replaced, not merged: the cleared muscle value is gone.
    expect(scale).toMatchObject({ bodyFatPct: 19.8, weightKg: 80.2 })
    expect(scale.muscleMassKg).toBeUndefined()

    const backup = JSON.parse(JSON.stringify(await repos.backup.exportAll()))
    expect(backup.data.bodyComps).toHaveLength(2)
    await repos.bodyComps.remove(scale.id)
    await repos.backup.importAll(backup)
    expect(await repos.bodyComps.all()).toHaveLength(2)
  })
})
