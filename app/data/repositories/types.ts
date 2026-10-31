import type {
  Backup,
  BodyComp,
  BodyCompMethod,
  BodyWeight,
  DayMeta,
  DayType,
  Exercise,
  Food,
  FoodLogEntry,
  Meal,
  NewEntity,
  Profile,
  Supplement,
  SupplementLog,
  Targets,
  WorkoutSession,
  WorkoutTemplate,
} from "~/domain/schemas"
import type { DateKey } from "~/domain/dates"

/**
 * Storage-agnostic contracts. Features depend on these only; today they are
 * backed by IndexedDB, later they can be backed by a sync service.
 */

export interface Entity {
  id: string
  createdAt: number
  updatedAt: number
}

export interface CrudRepo<T extends Entity> {
  all(): Promise<T[]>
  get(id: string): Promise<T | undefined>
  create(input: NewEntity<T>): Promise<T>
  update(id: string, patch: Partial<NewEntity<T>>): Promise<T | undefined>
  remove(id: string): Promise<void>
}

export interface ProfileRepo {
  get(): Promise<Profile | undefined>
  save(input: NewEntity<Profile>): Promise<Profile>
}

export interface TargetsRepo {
  get(): Promise<Targets | undefined>
  save(input: NewEntity<Targets>): Promise<Targets>
}

export interface FoodRepo extends CrudRepo<Food> {
  variationsOf(baseFoodId: string): Promise<Food[]>
}

export type MealRepo = CrudRepo<Meal>

export interface FoodLogRepo extends CrudRepo<FoodLogEntry> {
  byDate(date: DateKey): Promise<FoodLogEntry[]>
  byRange(start: DateKey, end: DateKey): Promise<FoodLogEntry[]>
  addMany(inputs: NewEntity<FoodLogEntry>[]): Promise<FoodLogEntry[]>
  /** Distinct food ids, most recently logged first. */
  recentFoodIds(limit: number): Promise<string[]>
}

export interface DayMetaRepo {
  get(date: DateKey): Promise<DayMeta | undefined>
  byRange(start: DateKey, end: DateKey): Promise<DayMeta[]>
  /** Pass undefined to clear the override and fall back to inference. */
  setDayType(date: DateKey, dayType: DayType | undefined): Promise<void>
}

export type ExerciseRepo = CrudRepo<Exercise>
export type TemplateRepo = CrudRepo<WorkoutTemplate>

export interface SessionRepo extends CrudRepo<WorkoutSession> {
  byDate(date: DateKey): Promise<WorkoutSession[]>
  byRange(start: DateKey, end: DateKey): Promise<WorkoutSession[]>
  /** The unfinished session, if any. */
  active(): Promise<WorkoutSession | undefined>
}

export type SupplementRepo = CrudRepo<Supplement>

export interface SupplementLogRepo {
  all(): Promise<SupplementLog[]>
  byDate(date: DateKey): Promise<SupplementLog[]>
  byRange(start: DateKey, end: DateKey): Promise<SupplementLog[]>
  setTaken(date: DateKey, supplementId: string, taken: boolean): Promise<void>
}

export interface BodyWeightRepo {
  all(): Promise<BodyWeight[]>
  latest(): Promise<BodyWeight | undefined>
  /** One entry per day; logging again replaces it. */
  upsert(date: DateKey, kg: number): Promise<BodyWeight>
  remove(id: string): Promise<void>
}

export type BodyCompInput = Omit<NewEntity<BodyComp>, "date" | "method">

export interface BodyCompRepo {
  all(): Promise<BodyComp[]>
  byDate(date: DateKey): Promise<BodyComp[]>
  /** One reading per day per method; logging again replaces it. */
  upsert(date: DateKey, method: BodyCompMethod, values: BodyCompInput): Promise<BodyComp>
  remove(id: string): Promise<void>
}

export interface BackupRepo {
  exportAll(): Promise<Backup>
  /** Replaces all user data with the backup contents. */
  importAll(backup: Backup): Promise<void>
}

export interface Repositories {
  profile: ProfileRepo
  targets: TargetsRepo
  foods: FoodRepo
  meals: MealRepo
  foodLog: FoodLogRepo
  dayMeta: DayMetaRepo
  exercises: ExerciseRepo
  templates: TemplateRepo
  sessions: SessionRepo
  supplements: SupplementRepo
  supplementLogs: SupplementLogRepo
  bodyWeights: BodyWeightRepo
  bodyComps: BodyCompRepo
  backup: BackupRepo
}
