import Dexie, { type Table } from "dexie"

import type {
  BodyComp,
  BodyWeight,
  DayMeta,
  Exercise,
  Food,
  FoodLogEntry,
  Meal,
  Profile,
  Supplement,
  SupplementLog,
  Targets,
  WorkoutSession,
  WorkoutTemplate,
} from "~/domain/schemas"

export interface MetaRecord {
  key: string
  value: unknown
}

/**
 * IndexedDB schema. Only repositories import this module; UI and hooks go
 * through `~/data/repositories`, so storage can be swapped for a sync backend.
 *
 * Pre-release: the schema is edited in place. The current database name
 * intentionally starts fresh because required profile fields were introduced.
 */
export class AppDB extends Dexie {
  profile!: Table<Profile, string>
  targets!: Table<Targets, string>
  foods!: Table<Food, string>
  meals!: Table<Meal, string>
  foodLog!: Table<FoodLogEntry, string>
  dayMeta!: Table<DayMeta, string>
  exercises!: Table<Exercise, string>
  templates!: Table<WorkoutTemplate, string>
  sessions!: Table<WorkoutSession, string>
  supplements!: Table<Supplement, string>
  supplementLogs!: Table<SupplementLog, string>
  bodyWeights!: Table<BodyWeight, string>
  bodyComps!: Table<BodyComp, string>
  meta!: Table<MetaRecord, string>

  constructor(name = "macro-forge-v2") {
    super(name)
    this.version(1).stores({
      profile: "id",
      targets: "id",
      foods: "id, name, baseFoodId, source, updatedAt",
      meals: "id, name, updatedAt",
      foodLog: "id, date, foodId, createdAt",
      dayMeta: "date",
      exercises: "id, name, primaryMuscle, source",
      templates: "id, name, updatedAt",
      sessions: "id, date, startedAt",
      supplements: "id, name",
      supplementLogs: "id, date, supplementId, &[date+supplementId]",
      bodyWeights: "id, &date",
      // One body-composition reading per day per method.
      bodyComps: "id, date, method, &[date+method]",
      meta: "key",
    })
  }
}

export const db = new AppDB()

/** Tables included in backups, in import order. */
export const BACKUP_TABLES = [
  "profile",
  "targets",
  "foods",
  "meals",
  "foodLog",
  "dayMeta",
  "exercises",
  "templates",
  "sessions",
  "supplements",
  "supplementLogs",
  "bodyWeights",
  "bodyComps",
] as const
export type BackupTable = (typeof BACKUP_TABLES)[number]
