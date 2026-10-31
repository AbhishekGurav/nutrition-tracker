import type { AppDB } from "~/data/db"
import type { Equipment, Exercise, Food, MuscleGroup } from "~/domain/schemas"
import { equipmentSchema, exerciseSchema, foodSchema, muscleGroupSchema } from "~/domain/schemas"
import foodsJson from "~/data/seed/foods.json"
import exercisesJson from "~/data/seed/exercises.json"

/** Bump when seed JSON changes so existing installs pick up the new data. */
export const SEED_VERSION = 1
const SEED_KEY = "seedVersion"
// Fixed timestamp keeps seed records stable across installs and backups.
const SEED_TIME = Date.UTC(2026, 0, 1)

export const seedFoodId = (key: string) => `seed-food-${key}`
export const seedExerciseId = (key: string) => `seed-ex-${key}`

export function buildSeedFoods(): Food[] {
  return foodsJson.foods.map((f) =>
    foodSchema.parse({
      id: seedFoodId(f.key),
      name: f.name,
      category: f.cat,
      per100g: { kcal: f.k, protein: f.p, carbs: f.c, fat: f.f },
      servings: f.s.map(([label, grams]) => ({ label: String(label), grams: Number(grams) })),
      source: "seed",
      createdAt: SEED_TIME,
      updatedAt: SEED_TIME,
    } satisfies Food)
  )
}

export function buildSeedExercises(): Exercise[] {
  return exercisesJson.exercises.map((e) =>
    exerciseSchema.parse({
      id: seedExerciseId(e.key),
      name: e.name,
      primaryMuscle: muscleGroupSchema.parse(e.m) satisfies MuscleGroup,
      secondaryMuscles: e.s.map((m) => muscleGroupSchema.parse(m)),
      equipment: equipmentSchema.parse(e.e) satisfies Equipment,
      description: e.d,
      source: "seed",
      createdAt: SEED_TIME,
      updatedAt: SEED_TIME,
    })
  )
}

/**
 * Idempotent: writes the bundled library once per SEED_VERSION. Seed records
 * are read-only in the UI (users make variations), so overwriting is safe.
 */
export async function ensureSeeded(db: AppDB): Promise<{ seeded: boolean }> {
  const current = await db.meta.get(SEED_KEY)
  if (typeof current?.value === "number" && current.value >= SEED_VERSION) {
    return { seeded: false }
  }
  const foods = buildSeedFoods()
  const exercises = buildSeedExercises()
  await db.transaction("rw", db.foods, db.exercises, db.meta, async () => {
    await db.foods.bulkPut(foods)
    await db.exercises.bulkPut(exercises)
    await db.meta.put({ key: SEED_KEY, value: SEED_VERSION })
  })
  return { seeded: true }
}
