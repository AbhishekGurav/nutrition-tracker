import { db } from "~/data/db"
import { createDexieRepositories } from "~/data/repositories/dexie"

export type * from "~/data/repositories/types"
export { newId } from "~/data/repositories/dexie"

/** The app-wide repository set. Swap the implementation here to change storage. */
export const repositories = createDexieRepositories(db)
