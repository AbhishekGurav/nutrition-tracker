import { z } from "zod"

/**
 * Single source of truth for persisted entities. Every record carries a UUID
 * and timestamps so a sync backend can be added later without migrations.
 * All weights are stored in kg and all food quantities in grams.
 */

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD")

const base = {
  id: z.string().min(1),
  createdAt: z.number(),
  updatedAt: z.number(),
}

export const macrosSchema = z.object({
  kcal: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
})
export type Macros = z.infer<typeof macrosSchema>
export type MacroKey = keyof Macros
export const MACRO_KEYS = ["kcal", "protein", "carbs", "fat"] as const

// ---------- Profile & targets ----------

export const sexSchema = z.enum(["male", "female"])
export const unitSystemSchema = z.enum(["metric", "imperial"])
export const activityLevelSchema = z.enum([
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
])
export const goalSchema = z.enum(["cut", "recomp", "maintain", "bulk"])
export const trainingExperienceSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
])
export type TrainingExperience = z.infer<typeof trainingExperienceSchema>

/** A locally generated JPEG/PNG/WebP data URL. SVG is intentionally excluded. */
export const avatarDataUrlSchema = z
  .string()
  .max(700_000, "Profile photo is too large")
  .regex(
    /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/,
    "Invalid profile photo"
  )

/** Body-composition goal. Target weight is derived: lean / (1 - bf%). */
export const bodyGoalSchema = z.object({
  targetBodyFatPct: z.number().min(3).max(60),
  targetLeanKg: z.number().min(20).max(200),
  targetDate: dateKeySchema.optional(),
})
export type BodyGoal = z.infer<typeof bodyGoalSchema>

export const profileSchema = z.object({
  ...base,
  displayName: z.string().trim().min(1, "Display name is required").max(80),
  avatarDataUrl: avatarDataUrlSchema.optional(),
  trainingExperience: trainingExperienceSchema,
  bio: z.string().trim().max(280).optional(),
  sex: sexSchema,
  birthYear: z.number().int().min(1900).max(2100),
  heightCm: z.number().min(100).max(250),
  /** Starting weight; the latest body-weight entry takes precedence. */
  weightKg: z.number().min(30).max(350),
  unitSystem: unitSystemSchema,
  activityLevel: activityLevelSchema,
  goal: goalSchema,
  proteinPerKg: z.number().min(1).max(3.5),
  /** Used instead of proteinPerKg when body fat % is known. */
  proteinPerKgLean: z.number().min(1).max(4).optional(),
  trainingDaysPerWeek: z.number().int().min(0).max(7),
  bodyGoal: bodyGoalSchema.optional(),
})
export type Profile = z.infer<typeof profileSchema>
export type Sex = z.infer<typeof sexSchema>
export type UnitSystem = z.infer<typeof unitSystemSchema>
export type ActivityLevel = z.infer<typeof activityLevelSchema>
export type Goal = z.infer<typeof goalSchema>

export const dayTypeSchema = z.enum(["training", "rest"])
export type DayType = z.infer<typeof dayTypeSchema>

const overridesSchema = z.object({
  kcal: z.boolean().optional(),
  protein: z.boolean().optional(),
  carbs: z.boolean().optional(),
  fat: z.boolean().optional(),
})
export type MacroOverrides = z.infer<typeof overridesSchema>

export const targetsSchema = z.object({
  ...base,
  training: macrosSchema,
  rest: macrosSchema,
  overrides: z.object({ training: overridesSchema, rest: overridesSchema }),
})
export type Targets = z.infer<typeof targetsSchema>

// ---------- Food ----------

export const servingSchema = z.object({
  label: z.string().min(1),
  grams: z.number().positive(),
})
export type Serving = z.infer<typeof servingSchema>

export const foodSourceSchema = z.enum(["seed", "user"])

export const foodSchema = z.object({
  ...base,
  name: z.string().min(1),
  brand: z.string().optional(),
  category: z.string().optional(),
  /** Set when this food is a user variation of another food. */
  baseFoodId: z.string().optional(),
  per100g: macrosSchema,
  servings: z.array(servingSchema),
  source: foodSourceSchema,
})
export type Food = z.infer<typeof foodSchema>

export const mealItemSchema = z.object({
  foodId: z.string(),
  grams: z.number().positive(),
})
export type MealItem = z.infer<typeof mealItemSchema>

export const mealSchema = z.object({
  ...base,
  name: z.string().min(1),
  items: z.array(mealItemSchema),
})
export type Meal = z.infer<typeof mealSchema>

export const mealSlotSchema = z.enum(["breakfast", "lunch", "dinner", "snacks"])
export type MealSlot = z.infer<typeof mealSlotSchema>
export const MEAL_SLOTS = mealSlotSchema.options

export const foodLogEntrySchema = z.object({
  ...base,
  date: dateKeySchema,
  slot: mealSlotSchema,
  /** Absent for quick-add entries. */
  foodId: z.string().optional(),
  name: z.string().min(1),
  grams: z.number().min(0),
  servingLabel: z.string().optional(),
  /** Per-100g snapshot taken at log time, so later food edits don't rewrite history. */
  per100g: macrosSchema.optional(),
  /** Totals for this entry (snapshot). */
  macros: macrosSchema,
})
export type FoodLogEntry = z.infer<typeof foodLogEntrySchema>

export const dayMetaSchema = z.object({
  date: dateKeySchema,
  /** Explicit override; when absent, a logged workout makes it a training day. */
  dayType: dayTypeSchema.optional(),
  updatedAt: z.number(),
})
export type DayMeta = z.infer<typeof dayMetaSchema>

// ---------- Training ----------

export const muscleGroupSchema = z.enum([
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
])
export type MuscleGroup = z.infer<typeof muscleGroupSchema>
export const MUSCLE_GROUPS = muscleGroupSchema.options

export const equipmentSchema = z.enum([
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "band",
  "other",
])
export type Equipment = z.infer<typeof equipmentSchema>
export const EQUIPMENT = equipmentSchema.options

export const exerciseSchema = z.object({
  ...base,
  name: z.string().min(1),
  primaryMuscle: muscleGroupSchema,
  secondaryMuscles: z.array(muscleGroupSchema),
  equipment: equipmentSchema,
  description: z.string().optional(),
  source: foodSourceSchema,
})
export type Exercise = z.infer<typeof exerciseSchema>

export const templateExerciseSchema = z.object({
  exerciseId: z.string(),
  targetSets: z.number().int().min(1).max(20),
  repMin: z.number().int().min(1).max(100),
  repMax: z.number().int().min(1).max(100),
})
export type TemplateExercise = z.infer<typeof templateExerciseSchema>

export const workoutTemplateSchema = z.object({
  ...base,
  name: z.string().min(1),
  exercises: z.array(templateExerciseSchema),
})
export type WorkoutTemplate = z.infer<typeof workoutTemplateSchema>

export const setEntrySchema = z.object({
  id: z.string(),
  weightKg: z.number().min(0),
  reps: z.number().int().min(0),
  rpe: z.number().min(1).max(10).optional(),
  isWarmup: z.boolean(),
  done: z.boolean(),
})
export type SetEntry = z.infer<typeof setEntrySchema>

export const sessionExerciseSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  sets: z.array(setEntrySchema),
})
export type SessionExercise = z.infer<typeof sessionExerciseSchema>

export const workoutSessionSchema = z.object({
  ...base,
  date: dateKeySchema,
  name: z.string(),
  templateId: z.string().optional(),
  startedAt: z.number(),
  endedAt: z.number().optional(),
  notes: z.string().optional(),
  exercises: z.array(sessionExerciseSchema),
})
export type WorkoutSession = z.infer<typeof workoutSessionSchema>

// ---------- Supplements ----------

export const supplementTimingSchema = z.enum([
  "morning",
  "with_meal",
  "pre_workout",
  "post_workout",
  "evening",
])
export type SupplementTiming = z.infer<typeof supplementTimingSchema>
export const SUPPLEMENT_TIMINGS = supplementTimingSchema.options

export const supplementSchema = z.object({
  ...base,
  name: z.string().min(1),
  dose: z.number().positive(),
  unit: z.string().min(1),
  timing: supplementTimingSchema,
  active: z.boolean(),
  /** First day this supplement counts toward adherence. */
  startDate: dateKeySchema,
})
export type Supplement = z.infer<typeof supplementSchema>

export const supplementLogSchema = z.object({
  ...base,
  date: dateKeySchema,
  supplementId: z.string(),
  takenAt: z.number(),
})
export type SupplementLog = z.infer<typeof supplementLogSchema>

// ---------- Body ----------

export const bodyWeightSchema = z.object({
  ...base,
  date: dateKeySchema,
  kg: z.number().min(20).max(400),
})
export type BodyWeight = z.infer<typeof bodyWeightSchema>

/**
 * How a body-composition reading was taken. Methods disagree by several
 * percentage points, so trends are only drawn within one method.
 */
export const bodyCompMethodSchema = z.enum([
  "scale",
  "dexa",
  "bia",
  "calipers",
  "tape",
  "other",
])
export type BodyCompMethod = z.infer<typeof bodyCompMethodSchema>
export const BODY_COMP_METHODS = bodyCompMethodSchema.options

export const bodyCompSchema = z.object({
  ...base,
  date: dateKeySchema,
  method: bodyCompMethodSchema,
  /** Body weight at the time of the reading (kg). */
  weightKg: z.number().min(20).max(400),
  bodyFatPct: z.number().min(2).max(70).optional(),
  /** "Muscle mass" exactly as the device reports it (not lean body mass). */
  muscleMassKg: z.number().min(5).max(200).optional(),
  waistCm: z.number().min(30).max(250).optional(),
  neckCm: z.number().min(15).max(80).optional(),
  hipCm: z.number().min(40).max(250).optional(),
})
export type BodyComp = z.infer<typeof bodyCompSchema>

// ---------- Backup ----------

export const BACKUP_FORMAT = "macro-forge-backup"
export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(1),
  exportedAt: z.number(),
  data: z.object({
    profile: z.array(profileSchema),
    targets: z.array(targetsSchema),
    foods: z.array(foodSchema),
    meals: z.array(mealSchema),
    foodLog: z.array(foodLogEntrySchema),
    dayMeta: z.array(dayMetaSchema),
    exercises: z.array(exerciseSchema),
    templates: z.array(workoutTemplateSchema),
    sessions: z.array(workoutSessionSchema),
    supplements: z.array(supplementSchema),
    supplementLogs: z.array(supplementLogSchema),
    bodyWeights: z.array(bodyWeightSchema),
    bodyComps: z.array(bodyCompSchema),
  }),
})
export type Backup = z.infer<typeof backupSchema>

/** Fields the repositories fill in on create. */
export type NewEntity<T> = Omit<T, "id" | "createdAt" | "updatedAt">
