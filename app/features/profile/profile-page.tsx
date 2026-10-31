import * as React from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { toast } from "sonner"

import type { Profile } from "~/domain/schemas"
import { GOAL_LABELS } from "~/domain/tdee"
import { useProfile } from "~/hooks/use-data"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { FieldGroup, FieldSeparator } from "~/components/ui/field"
import { Skeleton } from "~/components/ui/skeleton"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { SectionCard } from "~/components/shared/cards"
import { IdentityFields } from "~/features/profile/profile-identity-fields"
import { ProfileAvatar } from "~/features/profile/profile-avatar"
import { EXPERIENCE_LABELS } from "~/features/profile/profile-meta"
import { ProfileDataSection } from "~/features/profile/profile-data-section"
import {
  ActivityFields,
  BodyStatsFields,
  GoalFields,
} from "~/features/settings/profile-fields"
import {
  currentBodyState,
  saveProfileDraft,
  toProfileDraft,
  type BodyState,
  type ProfileDraft,
} from "~/features/settings/profile-service"
import { PreferencesSection } from "~/features/settings/preferences-section"

export function ProfilePage() {
  const profile = useProfile()

  return (
    <>
      <PageHeader title="Profile" />
      <PageBody className="max-w-3xl">
        {profile === undefined ? (
          <Skeleton className="h-96" />
        ) : profile === null ? null : (
          <>
            <ProfileHero profile={profile} />
            <ProfileEditor key={profile.updatedAt} profile={profile} />
            <PreferencesSection profile={profile} />
            <ProfileDataSection />
          </>
        )}
      </PageBody>
    </>
  )
}

function ProfileHero({ profile }: { profile: Profile }) {
  const goal = profile.bodyGoal
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <ProfileAvatar
        displayName={profile.displayName}
        avatarDataUrl={profile.avatarDataUrl}
        size="hero"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <h2 className="truncate text-xl font-semibold">
            {profile.displayName}
          </h2>
          <p className="text-xs text-muted-foreground">
            {EXPERIENCE_LABELS[profile.trainingExperience].label} lifter
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge>{GOAL_LABELS[profile.goal].label}</Badge>
          {goal ? (
            <Badge variant="outline">
              {goal.targetBodyFatPct}% body fat · {goal.targetLeanKg} kg lean
            </Badge>
          ) : null}
        </div>
        {profile.bio ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {profile.bio}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function ProfileEditor({ profile }: { profile: Profile }) {
  const [draft, setDraft] = React.useState<ProfileDraft>(() =>
    toProfileDraft(profile)
  )
  const [saving, setSaving] = React.useState(false)
  const [nameError, setNameError] = React.useState<string>()
  const bodyState = useLiveQuery(() => currentBodyState(profile), [profile])
  const latestWeight = bodyState?.weightKg
  const baseline: ProfileDraft = {
    ...toProfileDraft(profile),
    weightKg: latestWeight ?? profile.weightKg,
  }
  const editState: BodyState = {
    ...(bodyState ?? {}),
    weightKg: draft.weightKg,
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline)
  const formId = "athlete-profile-form"

  React.useEffect(() => {
    if (latestWeight !== undefined) {
      setDraft((current) => ({ ...current, weightKg: latestWeight }))
    }
  }, [latestWeight])

  const patch = (value: Partial<ProfileDraft>) => {
    setDraft((current) => ({ ...current, ...value }))
    if (value.displayName !== undefined) setNameError(undefined)
  }

  const save = async () => {
    if (!draft.displayName.trim()) {
      setNameError("Display name is required.")
      return
    }
    setSaving(true)
    try {
      await saveProfileDraft(profile, draft)
      toast.success("Profile saved. Targets updated where needed.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      title="Athlete profile"
      description="Identity, body stats, training experience and body-composition goal."
      footer={
        <Button type="submit" form={formId} isDisabled={saving || !dirty}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <FieldGroup>
          <IdentityFields
            draft={draft}
            onChange={patch}
            nameError={nameError}
          />
          <FieldSeparator />
          <BodyStatsFields draft={draft} onChange={patch} showUnits={false} />
          <FieldSeparator />
          <ActivityFields draft={draft} onChange={patch} />
          <FieldSeparator />
          <GoalFields draft={draft} onChange={patch} state={editState} />
        </FieldGroup>
      </form>
    </SectionCard>
  )
}
