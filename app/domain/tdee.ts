import type {
  ActivityLevel,
  DayType,
  Goal,
  MacroKey,
  MacroOverrides,
  Macros,
  Profile,
  Sex,
  Targets,
} from "~/domain/schemas"
import { MACRO_KEYS } from "~/domain/schemas"
import { KCAL_PER_GRAM } from "~/domain/macros"
import type { BodyGoalPlan } from "~/domain/body-comp"

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export const ACTIVITY_LABELS: Record<ActivityLevel, { label: string; hint: string }> = {
  sedentary: { label: "Sedentary", hint: "Desk job, little walking" },
  light: { label: "Light", hint: "Some walking, 1–3 sessions a week" },
  moderate: { label: "Moderate", hint: "On your feet often, 3–5 sessions" },
  active: { label: "Active", hint: "Physical job or 6+ sessions" },
  very_active: { label: "Very active", hint: "Hard daily training or labour" },
}

/** Energy balance multiplier per goal. */
export const GOAL_FACTORS: Record<Goal, number> = {
  cut: 0.8,
  recomp: 0.95,
  maintain: 1,
  bulk: 1.1,
}

export const GOAL_LABELS: Record<Goal, { label: string; hint: string }> = {
  cut: { label: "Cut", hint: "Lose fat, keep muscle. About 20% below maintenance" },
  recomp: { label: "Recomp", hint: "Lose fat and build muscle at about the same weight" },
  maintain: { label: "Maintain", hint: "Hold weight and composition" },
  bulk: { label: "Lean bulk", hint: "Build muscle with minimal fat. About 10% above maintenance" },
}

/** Default protein per goal in g/kg body weight (higher in a deficit). */
export const DEFAULT_PROTEIN_PER_KG: Record<Goal, number> = {
  cut: 2.2,
  recomp: 2.2,
  maintain: 1.8,
  bulk: 1.8,
}

/** Default protein per goal in g/kg of lean mass, used when body fat % is known. */
export const DEFAULT_PROTEIN_PER_KG_LEAN: Record<Goal, number> = {
  cut: 2.6,
  recomp: 2.5,
  maintain: 2.2,
  bulk: 2.2,
}

/** Katch-McArdle resting energy from lean body mass (kcal/day). */
export function bmrKatchMcArdle(leanKg: number) {
  return 370 + 21.6 * leanKg
}

/** Energy per kg of body fat, used to turn a fat-loss pace into a daily deficit. */
export const KCAL_PER_KG_FAT = 7700

/**
 * Calorie multiplier for the phase. With a dated body-composition goal the
 * cut deficit follows the required fat-loss pace (clamped to 10–25%), and
 * the bulk surplus scales with the lean-gain pace (5–15%).
 */
export function energyFactorFor(goal: Goal, plan: BodyGoalPlan | undefined, tdee: number) {
  const base = GOAL_FACTORS[goal]
  const weekly = plan?.weekly
  if (!weekly || tdee <= 0) return base
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  if (goal === "cut" && weekly.fatKg < 0) {
    const deficit = (-weekly.fatKg * KCAL_PER_KG_FAT) / 7
    return clamp(1 - deficit / tdee, 0.75, 0.9)
  }
  if (goal === "bulk" && weekly.leanKg > 0) {
    const perMonth = weekly.leanKg * 4.345
    return clamp(1 + perMonth * 0.1, 1.05, 1.15)
  }
  return base
}

/** Share of calories from fat, with an absolute floor in g/kg. */
export const FAT_SHARE = 0.25
export const FAT_FLOOR_PER_KG = 0.6
/** Calories shifted toward training days (as carbs); weekly average is unchanged. */
export const TRAINING_DAY_SHIFT_KCAL = 250

export interface BodyStats {
  sex: Sex
  weightKg: number
  heightCm: number
  age: number
}

/** Mifflin-St Jeor resting energy expenditure (kcal/day). */
export function bmrMifflinStJeor({ sex, weightKg, heightCm, age }: BodyStats) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === "male" ? base + 5 : base - 161
}

export function estimateTdee(stats: BodyStats, activity: ActivityLevel) {
  return bmrMifflinStJeor(stats) * ACTIVITY_MULTIPLIERS[activity]
}

export function ageFromBirthYear(birthYear: number, now: Date = new Date()) {
  return Math.max(0, now.getFullYear() - birthYear)
}

/** Split the training shift across the week so the weekly average equals `kcal`. */
export function splitDayCalories(
  kcal: number,
  trainingDaysPerWeek: number,
  shift = TRAINING_DAY_SHIFT_KCAL
) {
  const t = Math.min(7, Math.max(0, trainingDaysPerWeek))
  if (t === 0 || t === 7) return { training: kcal, rest: kcal }
  return {
    training: kcal + (shift * (7 - t)) / 7,
    rest: kcal - (shift * t) / 7,
  }
}

/** Protein fixed, fat floor, carbs fill the rest (never negative). */
export function macrosForCalories(
  kcal: number,
  proteinG: number,
  fatG: number
): Macros {
  const carbKcal = kcal - proteinG * KCAL_PER_GRAM.protein - fatG * KCAL_PER_GRAM.fat
  const carbs = Math.max(0, carbKcal / KCAL_PER_GRAM.carbs)
  const total =
    proteinG * KCAL_PER_GRAM.protein + fatG * KCAL_PER_GRAM.fat + carbs * KCAL_PER_GRAM.carbs
  return {
    kcal: Math.round(Math.max(kcal, total)),
    protein: Math.round(proteinG),
    carbs: Math.round(carbs),
    fat: Math.round(fatG),
  }
}

export type TargetInputs = Pick<
  Profile,
  | "sex"
  | "birthYear"
  | "heightCm"
  | "activityLevel"
  | "goal"
  | "proteinPerKg"
  | "proteinPerKgLean"
  | "trainingDaysPerWeek"
> & {
  weightKg: number
  /** When known, energy uses Katch-McArdle and protein is set per kg of lean mass. */
  bodyFatPct?: number
  /** A body-composition goal plan; sets the deficit or surplus pace. */
  plan?: BodyGoalPlan
}

export interface CalculatedTargets {
  tdee: number
  goalKcal: number
  training: Macros
  rest: Macros
  /** Which energy equation was used. */
  method: "mifflin" | "katch"
  leanMassKg?: number
  energyFactor: number
}

export function calculateTargets(
  input: TargetInputs,
  now: Date = new Date()
): CalculatedTargets {
  const age = ageFromBirthYear(input.birthYear, now)
  const leanMassKg =
    input.bodyFatPct !== undefined ? input.weightKg * (1 - input.bodyFatPct / 100) : undefined
  const tdee =
    leanMassKg !== undefined
      ? bmrKatchMcArdle(leanMassKg) * ACTIVITY_MULTIPLIERS[input.activityLevel]
      : estimateTdee(
          { sex: input.sex, weightKg: input.weightKg, heightCm: input.heightCm, age },
          input.activityLevel
        )
  const energyFactor = energyFactorFor(input.goal, input.plan, tdee)
  const goalKcal = tdee * energyFactor
  const days = splitDayCalories(goalKcal, input.trainingDaysPerWeek)
  const protein =
    leanMassKg !== undefined
      ? (input.proteinPerKgLean ?? DEFAULT_PROTEIN_PER_KG_LEAN[input.goal]) * leanMassKg
      : input.proteinPerKg * input.weightKg
  // Fat is set from the average day and kept equal on both day types;
  // the training-day surplus goes to carbs.
  const fat = Math.max(
    (goalKcal * FAT_SHARE) / KCAL_PER_GRAM.fat,
    FAT_FLOOR_PER_KG * input.weightKg
  )
  return {
    tdee: Math.round(tdee),
    goalKcal: Math.round(goalKcal),
    training: macrosForCalories(days.training, protein, fat),
    rest: macrosForCalories(days.rest, protein, fat),
    method: leanMassKg !== undefined ? "katch" : "mifflin",
    leanMassKg,
    energyFactor,
  }
}

/**
 * Apply freshly calculated values while keeping any field the user overrode.
 * Pass `reset: true` to drop all overrides.
 */
export function mergeTargets(
  calculated: Pick<CalculatedTargets, "training" | "rest">,
  existing: Pick<Targets, "training" | "rest" | "overrides"> | undefined,
  { reset = false }: { reset?: boolean } = {}
): Pick<Targets, "training" | "rest" | "overrides"> {
  if (!existing || reset) {
    return {
      training: { ...calculated.training },
      rest: { ...calculated.rest },
      overrides: { training: {}, rest: {} },
    }
  }
  const pick = (day: DayType): Macros => {
    const out = { ...calculated[day] }
    for (const key of MACRO_KEYS) {
      if (existing.overrides[day][key]) out[key] = existing[day][key]
    }
    return out
  }
  return {
    training: pick("training"),
    rest: pick("rest"),
    overrides: {
      training: { ...existing.overrides.training },
      rest: { ...existing.overrides.rest },
    },
  }
}

/** Set one target value and mark it overridden. */
export function overrideTarget(
  targets: Pick<Targets, "training" | "rest" | "overrides">,
  day: DayType,
  key: MacroKey,
  value: number
): Pick<Targets, "training" | "rest" | "overrides"> {
  const overrides: MacroOverrides = { ...targets.overrides[day], [key]: true }
  return {
    ...targets,
    [day]: { ...targets[day], [key]: Math.max(0, Math.round(value)) },
    overrides: { ...targets.overrides, [day]: overrides },
  }
}

/** Restore one value to the calculated number and clear its override. */
export function clearOverride(
  targets: Pick<Targets, "training" | "rest" | "overrides">,
  calculated: Pick<CalculatedTargets, "training" | "rest">,
  day: DayType,
  key: MacroKey
): Pick<Targets, "training" | "rest" | "overrides"> {
  const overrides: MacroOverrides = { ...targets.overrides[day] }
  delete overrides[key]
  return {
    ...targets,
    [day]: { ...targets[day], [key]: calculated[day][key] },
    overrides: { ...targets.overrides, [day]: overrides },
  }
}
