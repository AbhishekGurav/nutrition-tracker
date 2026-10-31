import { useLiveQuery } from "dexie-react-hooks"

import { repositories } from "~/data/repositories"
import type { DateKey } from "~/domain/dates"
import type { DayType, Macros } from "~/domain/schemas"
import { weightUnitFor } from "~/domain/units"

/**
 * Live-updating reads. Each hook re-renders when the underlying data changes.
 * `undefined` means "still loading"; hooks never import Dexie tables directly.
 */
function useRepo<T>(query: () => Promise<T>, deps: unknown[]): T | undefined {
  return useLiveQuery(query, deps)
}

export const useProfile = () => useRepo(() => repositories.profile.get().then((p) => p ?? null), [])
export const useTargets = () => useRepo(() => repositories.targets.get().then((t) => t ?? null), [])

export function useUnits() {
  const profile = useProfile()
  const system = profile?.unitSystem ?? "metric"
  return { system, weightUnit: weightUnitFor(system) } as const
}

export const useFoods = () => useRepo(() => repositories.foods.all(), [])
export const useFood = (id: string) =>
  useRepo(() => repositories.foods.get(id).then((f) => f ?? null), [id])
export const useVariations = (baseId: string) =>
  useRepo(() => repositories.foods.variationsOf(baseId), [baseId])
export const useMeals = () => useRepo(() => repositories.meals.all(), [])
export const useRecentFoodIds = (limit = 30) =>
  useRepo(() => repositories.foodLog.recentFoodIds(limit), [limit])

export const useFoodLog = (date: DateKey) =>
  useRepo(() => repositories.foodLog.byDate(date), [date])
export const useFoodLogRange = (start: DateKey, end: DateKey) =>
  useRepo(() => repositories.foodLog.byRange(start, end), [start, end])

export const useExercises = () => useRepo(() => repositories.exercises.all(), [])
export const useTemplates = () => useRepo(() => repositories.templates.all(), [])
export const useTemplate = (id: string) =>
  useRepo(() => repositories.templates.get(id).then((t) => t ?? null), [id])
export const useSessions = () => useRepo(() => repositories.sessions.all(), [])
export const useSession = (id: string) =>
  useRepo(() => repositories.sessions.get(id).then((s) => s ?? null), [id])
export const useActiveSession = () =>
  useRepo(() => repositories.sessions.active().then((s) => s ?? null), [])

export const useSupplements = () => useRepo(() => repositories.supplements.all(), [])
export const useSupplementLogs = () => useRepo(() => repositories.supplementLogs.all(), [])

export const useBodyWeights = () => useRepo(() => repositories.bodyWeights.all(), [])
export const useBodyComps = () => useRepo(() => repositories.bodyComps.all(), [])

export interface DayTypeInfo {
  dayType: DayType
  /** True when the user set it explicitly rather than it being inferred. */
  isOverride: boolean
  hasWorkout: boolean
}

/** Training day if explicitly set, otherwise if any workout was logged that day. */
export function useDayType(date: DateKey): DayTypeInfo | undefined {
  return useRepo(async () => {
    const [meta, sessions] = await Promise.all([
      repositories.dayMeta.get(date),
      repositories.sessions.byDate(date),
    ])
    const hasWorkout = sessions.length > 0
    return {
      dayType: meta?.dayType ?? (hasWorkout ? "training" : "rest"),
      isOverride: meta?.dayType !== undefined,
      hasWorkout,
    }
  }, [date])
}

/** Target macros for the given day type, or undefined while loading / not set. */
export function useDayTarget(date: DateKey): { target: Macros | null; info: DayTypeInfo } | undefined {
  const targets = useTargets()
  const info = useDayType(date)
  if (targets === undefined || info === undefined) return undefined
  return { target: targets ? targets[info.dayType] : null, info }
}
