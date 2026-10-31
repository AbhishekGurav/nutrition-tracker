import * as React from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete02Icon,
  Download01Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"

import { Button } from "~/components/ui/button"
import { SectionCard } from "~/components/shared/cards"
import { useConfirm } from "~/components/shared/confirm-dialog"
import {
  BackupError,
  downloadBackup,
  eraseAllData,
  restoreBackup,
} from "~/features/settings/backup"
import { loadSampleData } from "~/features/settings/sample-data"

/** Backup, restore and full local-profile deletion. */
export function ProfileDataSection() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const fileRef = React.useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      await restoreBackup(file)
      toast.success("Backup restored.")
      void navigate({ to: "/profile" })
    } catch (cause) {
      toast.error(
        cause instanceof BackupError
          ? cause.message
          : "Couldn't restore that backup."
      )
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <SectionCard
      title="Profile data"
      description="Everything stays on this device. A backup includes your profile photo, health measurements, food logs and workouts."
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          variant="outline"
          onPress={() =>
            void downloadBackup().then(() =>
              toast.success("Backup downloaded.")
            )
          }
        >
          <HugeiconsIcon
            icon={Download01Icon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          Export all data
        </Button>
        <Button
          variant="outline"
          onPress={() =>
            confirm.ask({
              title: "Restore from a backup?",
              description:
                "This replaces this profile and everything logged on this device.",
              confirmLabel: "Choose file",
              destructive: false,
              onConfirm: () => fileRef.current?.click(),
            })
          }
        >
          <HugeiconsIcon
            icon={Upload01Icon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          Import backup
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        {import.meta.env.DEV ? (
          <Button
            variant="secondary"
            onPress={async () => {
              await loadSampleData()
              toast.success("Sample data loaded (90 days).")
            }}
          >
            Load sample data
          </Button>
        ) : null}
        <Button
          variant="destructive"
          onPress={() =>
            confirm.ask({
              title: "Erase profile and all data?",
              description:
                "Your profile, photo, food logs, workouts, supplements, custom foods and measurements will be deleted. This can't be undone.",
              confirmLabel: "Erase profile & data",
              onConfirm: async () => {
                await eraseAllData()
                void navigate({ to: "/onboarding" })
              },
            })
          }
        >
          <HugeiconsIcon
            icon={Delete02Icon}
            strokeWidth={2}
            data-icon="inline-start"
          />
          Erase profile & data
        </Button>
      </div>
      {confirm.dialog}
    </SectionCard>
  )
}
