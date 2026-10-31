import { repositories } from "~/data/repositories"
import type { BodyComp, BodyCompMethod, NewEntity, Profile, Targets } from "~/domain/schemas"
import { calculateTargets, DEFAULT_PROTEIN_PER_KG, mergeTargets, type CalculatedTargets } from "~/domain/tdee"
import { latestBodyFat, planBodyGoal, type BodyGoalPlan } from "~/domain/body-comp"
import { todayKey } from "~/domain/dates"

export type ProfileDraft = NewEntity<Profile>
export type TargetsDraft = NewEntity<Targets>

export function defaultProfileDraft(now = new Date()): ProfileDraft {
  return {
    sex: "male",
    birthYear: now.getFullYear() - 30,
    heightCm: 175,
    weightKg: 75,
    unitSystem: "metric",
    activityLevel: "moderate",
    goal: "maintain",
    proteinPerKg: DEFAULT_PROTEIN_PER_KG.maintain,
    trainingDaysPerWeek: 4,
  }
}

/** What the targets are calculated from right now. */
export interface BodyState {
  weightKg: number
  bodyFatPct?: number
  /** The reading body fat came from, for display. */
  bodyFatSource?: Pick<BodyComp, "date" | "method">
}

/** Weight used for targets: latest weigh-in, else the profile's starting weight. */
export async function currentWeightKg(profile: Pick<Profile, "weightKg">) {
  const latest = await repositories.bodyWeights.latest()
  return latest?.kg ?? profile.weightKg
}

/** Latest weight plus the most recent body-fat reading (any method). */
export async function currentBodyState(profile: Pick<Profile, "weightKg">): Promise<BodyState> {
  const [weightKg, comps] = await Promise.all([currentWeightKg(profile), repositories.bodyComps.all()])
  const bf = latestBodyFat(comps)
  return bf
    ? { weightKg, bodyFatPct: bf.bodyFatPct, bodyFatSource: { date: bf.date, method: bf.method } }
    : { weightKg }
}

/** The goal plan, when there's a goal and a body-fat reading to measure from. */
export function planForProfile(profile: Pick<ProfileDraft, "bodyGoal">, state: BodyState): BodyGoalPlan | undefined {
  if (!profile.bodyGoal || state.bodyFatPct === undefined) return undefined
  return planBodyGoal({ weightKg: state.weightKg, bodyFatPct: state.bodyFatPct }, profile.bodyGoal, todayKey())
}

export function calculateForProfile(
  profile: ProfileDraft,
  state: BodyState = { weightKg: profile.weightKg }
): CalculatedTargets {
  return calculateTargets({
    ...profile,
    weightKg: state.weightKg,
    bodyFatPct: state.bodyFatPct,
    plan: planForProfile(profile, state),
  })
}

export interface InitialBodyFat {
  bodyFatPct: number
  method: BodyCompMethod
}

/** First-run save: profile, targets, a starting weigh-in and optional body-fat reading. */
export async function completeOnboarding(profile: ProfileDraft, targets: TargetsDraft, bodyFat?: InitialBodyFat) {
  const today = todayKey()
  await repositories.profile.save(profile)
  await repositories.targets.save(targets)
  await repositories.bodyWeights.upsert(today, profile.weightKg)
  if (bodyFat) {
    await repositories.bodyComps.upsert(today, bodyFat.method, {
      weightKg: profile.weightKg,
      bodyFatPct: bodyFat.bodyFatPct,
    })
  }
}

/**
 * Recompute targets from the saved profile, latest weight and body fat,
 * keeping any user overrides unless `reset` is set.
 */
export async function recalculateTargets({ reset = false }: { reset?: boolean } = {}) {
  const profile = await repositories.profile.get()
  if (!profile) return undefined
  const state = await currentBodyState(profile)
  const calculated = calculateForProfile(profile, state)
  const existing = await repositories.targets.get()
  const merged = mergeTargets(calculated, existing, { reset })
  await repositories.targets.save(merged)
  return { calculated, targets: merged }
}

let hasProfileCache = false
/** Used by the router guard; cached once true so navigation stays instant. */
export async function hasProfile() {
  if (hasProfileCache) return true
  hasProfileCache = (await repositories.profile.get()) !== undefined
  return hasProfileCache
}
export function resetProfileCache() {
  hasProfileCache = false
}
