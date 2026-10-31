import { repositories } from "~/data/repositories"
import { BACKUP_FORMAT, backupSchema, type Backup } from "~/domain/schemas"
import { todayKey } from "~/domain/dates"
import { resetProfileCache } from "~/features/settings/profile-service"

/** Triggers a JSON download of all user data. */
export async function downloadBackup() {
  const backup = await repositories.backup.exportAll()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `macro-forge-backup-${todayKey()}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export class BackupError extends Error {}

/** Validates the file before touching any data; throws BackupError if invalid. */
export async function restoreBackup(file: File) {
  let json: unknown
  try {
    json = JSON.parse(await file.text())
  } catch {
    throw new BackupError("That file isn't valid JSON.")
  }
  const parsed = backupSchema.safeParse(json)
  if (!parsed.success) {
    throw new BackupError("That doesn't look like a Macro Forge backup.")
  }
  await repositories.backup.importAll(parsed.data)
  resetProfileCache()
}

/** Removes all user data (the bundled food and exercise library stays). */
export async function eraseAllData() {
  const empty: Backup = {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: Date.now(),
    data: {
      profile: [],
      targets: [],
      foods: [],
      meals: [],
      foodLog: [],
      dayMeta: [],
      exercises: [],
      templates: [],
      sessions: [],
      supplements: [],
      supplementLogs: [],
      bodyWeights: [],
      bodyComps: [],
    },
  }
  await repositories.backup.importAll(empty)
  resetProfileCache()
}
