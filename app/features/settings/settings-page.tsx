import * as React from "react"
import { useNavigate } from "@tanstack/react-router"
import { useLiveQuery } from "dexie-react-hooks"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, Download01Icon, RefreshIcon, Upload01Icon } from "@hugeicons/core-free-icons"

import { repositories } from "~/data/repositories"
import { useProfile, useTargets } from "~/hooks/use-data"
import { Button } from "~/components/ui/button"
import { FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "~/components/ui/field"
import { Skeleton } from "~/components/ui/skeleton"
import { SectionCard } from "~/components/shared/cards"
import { ChoiceGroup } from "~/components/shared/choice"
import { useConfirm } from "~/components/shared/confirm-dialog"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { APP_NAME } from "~/components/layout/app-logo"
import type { Profile } from "~/domain/schemas"
import { todayKey } from "~/domain/dates"
import {
  ActivityFields,
  BodyStatsFields,
  GoalFields,
  UNIT_OPTIONS,
} from "~/features/settings/profile-fields"
import { TargetsEditor } from "~/features/settings/targets-editor"
import {
  calculateForProfile,
  currentBodyState,
  recalculateTargets,
  type BodyState,
  type ProfileDraft,
} from "~/features/settings/profile-service"
import { BackupError, downloadBackup, eraseAllData, restoreBackup } from "~/features/settings/backup"
import { loadSampleData } from "~/features/settings/sample-data"
import { PalettePicker } from "~/features/settings/palette-picker"

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const

function toDraft({ id: _id, createdAt: _c, updatedAt: _u, ...rest }: Profile): ProfileDraft {
  return rest
}

function ProfileSection({ profile }: { profile: Profile }) {
  const [draft, setDraft] = React.useState<ProfileDraft>(() => toDraft(profile))
  const [saving, setSaving] = React.useState(false)
  const bodyState = useLiveQuery(() => currentBodyState(profile), [profile])
  const latestWeight = bodyState?.weightKg
  const baseline = { ...toDraft(profile), weightKg: latestWeight ?? profile.weightKg }
  // Plan against the weight being edited, with the latest body-fat reading.
  const editState: BodyState = { ...(bodyState ?? {}), weightKg: draft.weightKg }
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline)

  // Show the current weight (latest weigh-in), not the starting weight.
  React.useEffect(() => {
    if (latestWeight !== undefined) setDraft((d) => ({ ...d, weightKg: latestWeight }))
  }, [latestWeight])

  const patch = (p: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...p }))

  const save = async () => {
    setSaving(true)
    try {
      await repositories.profile.save({ ...draft, weightKg: profile.weightKg })
      if (latestWeight !== undefined && Math.abs(draft.weightKg - latestWeight) > 0.001) {
        await repositories.bodyWeights.upsert(todayKey(), draft.weightKg)
      }
      await recalculateTargets()
      toast.success("Profile saved. Targets updated (custom values kept).")
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      title="Profile"
      description="Changes here re-estimate your targets."
      footer={
        <Button onPress={() => void save()} isDisabled={saving || !dirty}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      }
    >
      <FieldGroup>
        <BodyStatsFields draft={draft} onChange={patch} />
        <FieldSeparator />
        <ActivityFields draft={draft} onChange={patch} />
        <FieldSeparator />
        <GoalFields draft={draft} onChange={patch} state={editState} />
      </FieldGroup>
    </SectionCard>
  )
}

function TargetsSection({ profile }: { profile: Profile }) {
  const targets = useTargets()
  const confirm = useConfirm()
  const calculated = useLiveQuery(
    async () => calculateForProfile(profile, await currentBodyState(profile)),
    [profile]
  )
  if (!targets || !calculated) return <Skeleton className="h-64" />

  const basis =
    calculated.method === "katch"
      ? `from your ${Math.round(calculated.leanMassKg ?? 0)} kg lean mass (Katch-McArdle)`
      : "from weight and height (Mifflin-St Jeor)"

  return (
    <SectionCard
      title="Daily targets"
      description={`Estimated maintenance ${calculated.tdee.toLocaleString()} kcal ${basis}. Edited values are marked Custom.`}
      footer={
        <>
          <Button
            variant="outline"
            onPress={async () => {
              await recalculateTargets()
              toast.success("Targets recalculated. Custom values kept.")
            }}
          >
            <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} data-icon="inline-start" />
            Recalculate
          </Button>
          <Button
            variant="ghost"
            onPress={() =>
              confirm.ask({
                title: "Reset all targets?",
                description: "This clears every custom value and uses the estimate.",
                confirmLabel: "Reset",
                onConfirm: async () => {
                  await recalculateTargets({ reset: true })
                  toast.success("Targets reset to the estimate.")
                },
              })
            }
          >
            Reset all
          </Button>
        </>
      }
    >
      <TargetsEditor
        value={targets}
        calculated={calculated}
        onChange={(next) => void repositories.targets.save(next)}
      />
      {confirm.dialog}
    </SectionCard>
  )
}

function PreferencesSection({ profile }: { profile: Profile }) {
  const { theme = "system", setTheme } = useTheme()
  const themeValue = THEME_OPTIONS.find((o) => o.value === theme)?.value ?? "system"
  return (
    <SectionCard title="Appearance & units">
      <FieldGroup>
        <PalettePicker />
        <div className="flex flex-col gap-2">
          <FieldLabel>Units</FieldLabel>
          <ChoiceGroup
            aria-label="Units"
            value={profile.unitSystem}
            options={UNIT_OPTIONS}
            onChange={(unitSystem) => {
              const { id: _i, createdAt: _c, updatedAt: _u, ...rest } = profile
              void repositories.profile.save({ ...rest, unitSystem })
            }}
          />
          <FieldDescription>Data is stored in kg and grams, so switching never loses precision.</FieldDescription>
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel>Mode</FieldLabel>
          <ChoiceGroup aria-label="Mode" value={themeValue} options={THEME_OPTIONS} onChange={setTheme} />
        </div>
      </FieldGroup>
    </SectionCard>
  )
}

function DataSection() {
  const navigate = useNavigate()
  const confirm = useConfirm()
  const fileRef = React.useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try {
      await restoreBackup(file)
      toast.success("Backup restored.")
      void navigate({ to: "/" })
    } catch (e) {
      toast.error(e instanceof BackupError ? e.message : "Couldn't restore that backup.")
    } finally {
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <SectionCard
      title="Your data"
      description="Everything stays on this device. Export a backup now and then, especially before clearing browser data."
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button variant="outline" onPress={() => void downloadBackup().then(() => toast.success("Backup downloaded."))}>
          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} data-icon="inline-start" />
          Export backup
        </Button>
        <Button
          variant="outline"
          onPress={() =>
            confirm.ask({
              title: "Restore from a backup?",
              description: "This replaces everything on this device with the backup's contents.",
              confirmLabel: "Choose file",
              destructive: false,
              onConfirm: () => fileRef.current?.click(),
            })
          }
        >
          <HugeiconsIcon icon={Upload01Icon} strokeWidth={2} data-icon="inline-start" />
          Import backup
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void onFile(e.target.files?.[0])}
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
              title: "Erase all data?",
              description: "Food logs, workouts, supplements, custom foods and your profile will be deleted. This can't be undone.",
              confirmLabel: "Erase everything",
              onConfirm: async () => {
                await eraseAllData()
                void navigate({ to: "/onboarding" })
              },
            })
          }
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} data-icon="inline-start" />
          Erase all data
        </Button>
      </div>
      {confirm.dialog}
    </SectionCard>
  )
}

export function SettingsPage() {
  const profile = useProfile()

  return (
    <>
      <PageHeader title="Settings" hideSettings />
      <PageBody className="max-w-3xl">
        {profile === undefined ? (
          <Skeleton className="h-96" />
        ) : profile === null ? null : (
          <>
            <PreferencesSection profile={profile} />
            <TargetsSection profile={profile} />
            <ProfileSection key={profile.updatedAt} profile={profile} />
            <DataSection />
            <SectionCard title={`About ${APP_NAME}`}>
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                <p>
                  Food values are derived from USDA FoodData Central (public domain). Energy estimates use Katch-McArdle when body fat is known, otherwise Mifflin-St Jeor. Tape estimates use the US Navy formula; estimated 1RM uses the Epley formula.
                </p>
                <p>Estimates are a starting point, not medical advice. Adjust targets based on how your weight trend responds over 2–3 weeks.</p>
              </div>
            </SectionCard>
          </>
        )}
      </PageBody>
    </>
  )
}
