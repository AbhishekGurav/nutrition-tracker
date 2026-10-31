import { repositories, newId } from "~/data/repositories"
import { seedExerciseId, seedFoodId } from "~/data/seed"
import type { FoodLogEntry, MealSlot, NewEntity, SessionExercise, WorkoutTemplate } from "~/domain/schemas"
import { addDays, parseDateKey, todayKey, type DateKey } from "~/domain/dates"
import { scaleMacros } from "~/domain/macros"
import { roundToIncrement } from "~/domain/units"

/** Deterministic PRNG so sample data looks the same on every load. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const DAY_MEALS: Record<MealSlot, [string, number][]> = {
  breakfast: [["oats-rolled", 80], ["whey-protein", 30], ["banana", 118]],
  lunch: [["chicken-breast-roasted", 200], ["white-rice-cooked", 250], ["broccoli-cooked", 150]],
  dinner: [["salmon-cooked", 150], ["potato-baked", 300], ["olive-oil", 10], ["mixed-veg-frozen", 150]],
  snacks: [["greek-yogurt-nonfat", 170], ["almonds", 28], ["blueberries", 100]],
}

const PROGRAM: { name: string; lifts: [string, number, number][] }[] = [
  { name: "Push", lifts: [["barbell-bench-press", 80, 5], ["overhead-press", 50, 6], ["incline-dumbbell-press", 28, 10], ["triceps-pushdown", 30, 12], ["lateral-raise", 10, 15]] },
  { name: "Pull", lifts: [["deadlift", 140, 5], ["pull-up", 0, 8], ["barbell-row", 70, 8], ["face-pull", 20, 15], ["dumbbell-curl", 14, 12]] },
  { name: "Legs", lifts: [["back-squat", 110, 5], ["romanian-deadlift", 90, 8], ["leg-press", 180, 12], ["lying-leg-curl", 40, 12], ["standing-calf-raise", 60, 15]] },
  { name: "Upper", lifts: [["dumbbell-bench-press", 32, 8], ["lat-pulldown", 60, 10], ["seated-dumbbell-press", 24, 10], ["seated-cable-row", 60, 10], ["hammer-curl", 16, 12]] },
]
const TRAINING_WEEKDAYS = [1, 2, 4, 5] // Mon, Tue, Thu, Fri

/** Dev helper: fills ~90 days of realistic data so every chart has something to show. */
export async function loadSampleData(days = 90) {
  const rand = rng(42)
  const today = todayKey()
  const start = addDays(today, -(days - 1))
  const foods = new Map((await repositories.foods.all()).map((f) => [f.id, f]))
  const profile = await repositories.profile.get()
  const startWeight = (profile?.weightKg ?? 82) + 2.5

  // Templates
  const templates: WorkoutTemplate[] = []
  for (const p of PROGRAM) {
    templates.push(
      await repositories.templates.create({
        name: `${p.name} (sample)`,
        exercises: p.lifts.map(([key]) => ({ exerciseId: seedExerciseId(key), targetSets: 3, repMin: 5, repMax: 12 })),
      })
    )
  }

  // Supplements
  const supplements = await Promise.all(
    [
      { name: "Creatine monohydrate", dose: 5, unit: "g", timing: "morning" as const },
      { name: "Vitamin D3", dose: 2000, unit: "IU", timing: "morning" as const },
      { name: "Fish oil", dose: 2, unit: "caps", timing: "with_meal" as const },
    ].map((s) => repositories.supplements.create({ ...s, active: true, startDate: start }))
  )

  let programIndex = 0
  for (let i = 0; i < days; i++) {
    const date: DateKey = addDays(start, i)
    const progress = i / days

    // Body weight: slow downward trend with daily noise, ~6 weigh-ins a week.
    const kg = Math.round((startWeight - 2.5 * progress + (rand() - 0.5) * 1.2) * 10) / 10
    if (rand() < 0.85) {
      await repositories.bodyWeights.upsert(date, kg)
    }

    // Recomp-ish composition: fat % drifts down, lean mass creeps up.
    // Weekly smart-scale readings (noisy) and a monthly tape check.
    if (i % 7 === 0) {
      const bf = 21 - 3 * progress + (rand() - 0.5) * 1.5
      const lean = kg * (1 - bf / 100)
      await repositories.bodyComps.upsert(date, "scale", {
        weightKg: kg,
        bodyFatPct: Math.round(bf * 10) / 10,
        muscleMassKg: Math.round(lean * 0.93 * 10) / 10,
      })
    }
    if (i % 30 === 0) {
      await repositories.bodyComps.upsert(date, "tape", {
        weightKg: kg,
        bodyFatPct: Math.round((19.5 - 2.5 * progress) * 10) / 10,
        waistCm: Math.round((88 - 3 * progress) * 10) / 10,
        neckCm: 39,
      })
    }

    // Food: most days logged, portions vary ±20%.
    if (date !== today && rand() < 0.9) {
      const entries: NewEntity<FoodLogEntry>[] = []
      for (const [slot, items] of Object.entries(DAY_MEALS) as [MealSlot, [string, number][]][]) {
        if (slot === "snacks" && rand() < 0.3) continue
        for (const [key, grams] of items) {
          const food = foods.get(seedFoodId(key))
          if (!food) continue
          const g = Math.round(grams * (0.8 + rand() * 0.4))
          entries.push({
            date,
            slot,
            foodId: food.id,
            name: food.name,
            grams: g,
            per100g: food.per100g,
            macros: scaleMacros(food.per100g, g),
          })
        }
      }
      await repositories.foodLog.addMany(entries)
    }

    // Supplements: ~85% adherence.
    for (const s of supplements) {
      if (rand() < 0.85) await repositories.supplementLogs.setTaken(date, s.id, true)
    }

    // Workouts with gentle progressive overload.
    const weekday = parseDateKey(date).getDay()
    if (date !== today && TRAINING_WEEKDAYS.includes(weekday)) {
      const p = PROGRAM[programIndex % PROGRAM.length]
      const template = templates[programIndex % PROGRAM.length]
      programIndex++
      const startedAt = parseDateKey(date).getTime() + 17.5 * 3600_000
      const exercises: SessionExercise[] = p.lifts.map(([key, baseKg, reps]) => {
        const kg = baseKg === 0 ? 0 : roundToIncrement(baseKg * (1 + 0.12 * progress), 2.5)
        return {
          id: newId(),
          exerciseId: seedExerciseId(key),
          sets: [
            { id: newId(), weightKg: roundToIncrement(kg * 0.6, 2.5), reps: 8, isWarmup: true, done: true },
            ...[0, 1, 2].map(() => ({
              id: newId(),
              weightKg: kg,
              reps: Math.max(1, reps + Math.round((rand() - 0.6) * 2)),
              rpe: 7 + Math.round(rand() * 4) / 2,
              isWarmup: false,
              done: true,
            })),
          ],
        }
      })
      await repositories.sessions.create({
        date,
        name: p.name,
        templateId: template.id,
        startedAt,
        endedAt: startedAt + (55 + rand() * 25) * 60_000,
        exercises,
      })
    }
  }
}
