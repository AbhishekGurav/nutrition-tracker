import type { Table } from "dexie"

import { BACKUP_TABLES, type AppDB } from "~/data/db"
import { buildSeedExercises, buildSeedFoods } from "~/data/seed"
import type { Profile, Targets } from "~/domain/schemas"
import { BACKUP_FORMAT, backupSchema, profileSchema } from "~/domain/schemas"
import type { CrudRepo, Entity, Repositories } from "~/data/repositories/types"

export function newId(): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  // Fallback for non-secure contexts (e.g. LAN testing over http).
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function createCrud<T extends Entity>(table: Table<T, string>): CrudRepo<T> {
  return {
    all: () => table.toArray(),
    get: (id) => table.get(id),
    async create(input) {
      const t = Date.now()
      // Spread order guarantees the generated fields win over stray input keys.
      const record = { ...input, id: newId(), createdAt: t, updatedAt: t } as T
      await table.add(record)
      return record
    },
    async update(id, patch) {
      const existing = await table.get(id)
      if (!existing) return undefined
      const next = { ...existing, ...patch, id, updatedAt: Date.now() } as T
      await table.put(next)
      return next
    },
    async remove(id) {
      await table.delete(id)
    },
  }
}

const SINGLETON_ID = "me"

export function createDexieRepositories(db: AppDB): Repositories {
  const foodCrud = createCrud(db.foods)
  const exerciseCrud = createCrud(db.exercises)
  const supplementCrud = createCrud(db.supplements)
  const foodLogCrud = createCrud(db.foodLog)
  const sessionCrud = createCrud(db.sessions)

  return {
    profile: {
      get: () => db.profile.get(SINGLETON_ID),
      async save(input) {
        const existing = await db.profile.get(SINGLETON_ID)
        const t = Date.now()
        const record = profileSchema.parse({
          ...input,
          displayName: input.displayName.trim(),
          bio: input.bio?.trim() || undefined,
          id: SINGLETON_ID,
          createdAt: existing?.createdAt ?? t,
          updatedAt: t,
        })
        await db.profile.put(record)
        return record
      },
    },

    targets: {
      get: () => db.targets.get(SINGLETON_ID),
      async save(input) {
        const existing = await db.targets.get(SINGLETON_ID)
        const t = Date.now()
        const record: Targets = {
          ...input,
          id: SINGLETON_ID,
          createdAt: existing?.createdAt ?? t,
          updatedAt: t,
        }
        await db.targets.put(record)
        return record
      },
    },

    foods: {
      ...foodCrud,
      variationsOf: (baseFoodId) =>
        db.foods.where("baseFoodId").equals(baseFoodId).sortBy("name"),
      async remove(id) {
        const food = await db.foods.get(id)
        if (!food) return
        if (food.source === "seed")
          throw new Error("Library foods can't be deleted")
        await db.transaction("rw", db.foods, db.meals, async () => {
          await db.foods.delete(id)
          // Variations of a deleted food become standalone foods.
          await db.foods
            .where("baseFoodId")
            .equals(id)
            .modify((f) => {
              delete f.baseFoodId
            })
          await db.meals.toCollection().modify((m) => {
            m.items = m.items.filter((i) => i.foodId !== id)
          })
        })
      },
    },

    meals: createCrud(db.meals),

    foodLog: {
      ...foodLogCrud,
      byDate: (date) =>
        db.foodLog.where("date").equals(date).sortBy("createdAt"),
      byRange: (start, end) =>
        db.foodLog.where("date").between(start, end, true, true).toArray(),
      async addMany(inputs) {
        const t = Date.now()
        const records = inputs.map((input, i) => ({
          ...input,
          id: newId(),
          // Keep insertion order stable within one batch.
          createdAt: t + i,
          updatedAt: t + i,
        }))
        await db.foodLog.bulkAdd(records)
        return records
      },
      async recentFoodIds(limit) {
        const ids: string[] = []
        const seen = new Set<string>()
        await db.foodLog
          .orderBy("createdAt")
          .reverse()
          .until(() => ids.length >= limit)
          .each((e) => {
            if (e.foodId && !seen.has(e.foodId)) {
              seen.add(e.foodId)
              ids.push(e.foodId)
            }
          })
        return ids
      },
    },

    dayMeta: {
      get: (date) => db.dayMeta.get(date),
      byRange: (start, end) =>
        db.dayMeta.where("date").between(start, end, true, true).toArray(),
      async setDayType(date, dayType) {
        if (dayType === undefined) await db.dayMeta.delete(date)
        else await db.dayMeta.put({ date, dayType, updatedAt: Date.now() })
      },
    },

    exercises: {
      ...exerciseCrud,
      async remove(id) {
        const ex = await db.exercises.get(id)
        if (!ex) return
        if (ex.source === "seed")
          throw new Error("Library exercises can't be deleted")
        await db.transaction("rw", db.exercises, db.templates, async () => {
          await db.exercises.delete(id)
          await db.templates.toCollection().modify((t) => {
            t.exercises = t.exercises.filter((e) => e.exerciseId !== id)
          })
        })
      },
    },

    templates: createCrud(db.templates),

    sessions: {
      ...sessionCrud,
      byDate: (date) => db.sessions.where("date").equals(date).toArray(),
      byRange: (start, end) =>
        db.sessions.where("date").between(start, end, true, true).toArray(),
      async active() {
        const open = await db.sessions
          .filter((s) => s.endedAt === undefined)
          .toArray()
        return open.sort((a, b) => b.startedAt - a.startedAt)[0]
      },
    },

    supplements: {
      ...supplementCrud,
      async remove(id) {
        await db.transaction(
          "rw",
          db.supplements,
          db.supplementLogs,
          async () => {
            await db.supplements.delete(id)
            await db.supplementLogs.where("supplementId").equals(id).delete()
          }
        )
      },
    },

    supplementLogs: {
      all: () => db.supplementLogs.toArray(),
      byDate: (date) => db.supplementLogs.where("date").equals(date).toArray(),
      byRange: (start, end) =>
        db.supplementLogs
          .where("date")
          .between(start, end, true, true)
          .toArray(),
      async setTaken(date, supplementId, taken) {
        const existing = await db.supplementLogs
          .where("[date+supplementId]")
          .equals([date, supplementId])
          .first()
        if (taken && !existing) {
          const t = Date.now()
          await db.supplementLogs.add({
            id: newId(),
            date,
            supplementId,
            takenAt: t,
            createdAt: t,
            updatedAt: t,
          })
        } else if (!taken && existing) {
          await db.supplementLogs.delete(existing.id)
        }
      },
    },

    bodyWeights: {
      all: () => db.bodyWeights.orderBy("date").toArray(),
      latest: () => db.bodyWeights.orderBy("date").last(),
      async upsert(date, kg) {
        const existing = await db.bodyWeights.where("date").equals(date).first()
        const t = Date.now()
        const record = existing
          ? { ...existing, kg, updatedAt: t }
          : { id: newId(), date, kg, createdAt: t, updatedAt: t }
        await db.bodyWeights.put(record)
        return record
      },
      async remove(id) {
        await db.bodyWeights.delete(id)
      },
    },

    bodyComps: {
      all: () => db.bodyComps.orderBy("date").toArray(),
      byDate: (date) => db.bodyComps.where("date").equals(date).toArray(),
      async upsert(date, method, values) {
        const existing = await db.bodyComps
          .where("[date+method]")
          .equals([date, method])
          .first()
        const t = Date.now()
        // Replace (not merge) so cleared fields don't linger from the old reading.
        const record = {
          ...values,
          date,
          method,
          id: existing?.id ?? newId(),
          createdAt: existing?.createdAt ?? t,
          updatedAt: t,
        }
        await db.bodyComps.put(record)
        return record
      },
      async remove(id) {
        await db.bodyComps.delete(id)
      },
    },

    backup: {
      async exportAll() {
        const data: Record<string, unknown[]> = Object.fromEntries(
          await Promise.all(
            BACKUP_TABLES.map(
              async (name) => [name, await db.table(name).toArray()] as const
            )
          )
        )
        // Library records are restored from the app bundle, so keep backups small.
        const notSeed = (r: unknown) =>
          !(
            typeof r === "object" &&
            r !== null &&
            "source" in r &&
            r.source === "seed"
          )
        data.foods = data.foods.filter(notSeed)
        data.exercises = data.exercises.filter(notSeed)
        return backupSchema.parse({
          format: BACKUP_FORMAT,
          version: 1,
          exportedAt: Date.now(),
          data,
        })
      },
      async importAll(backup) {
        const parsed = backupSchema.parse(backup)
        const tables = BACKUP_TABLES.map((name) => db.table(name))
        await db.transaction("rw", tables, async () => {
          for (const name of BACKUP_TABLES) {
            await db.table(name).clear()
            await db.table(name).bulkPut(parsed.data[name])
          }
          // The bundled library is always present, even if the backup predates it.
          await db.foods.bulkPut(buildSeedFoods())
          await db.exercises.bulkPut(buildSeedExercises())
        })
      },
    },
  }
}
