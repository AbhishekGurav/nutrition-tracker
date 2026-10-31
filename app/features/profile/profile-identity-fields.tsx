import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Camera01Icon, Delete02Icon } from "@hugeicons/core-free-icons"

import { Button } from "~/components/ui/button"
import { FieldDescription, FieldGroup } from "~/components/ui/field"
import { ChoiceCards } from "~/components/shared/choice"
import { TextField } from "~/components/shared/text-field"
import type { ProfileDraft } from "~/features/settings/profile-service"
import {
  AVATAR_ACCEPT,
  AvatarImageError,
  prepareAvatar,
} from "~/features/profile/avatar-image"
import { ProfileAvatar } from "~/features/profile/profile-avatar"
import { EXPERIENCE_OPTIONS } from "~/features/profile/profile-meta"

interface IdentityFieldsProps {
  draft: ProfileDraft
  onChange: (patch: Partial<ProfileDraft>) => void
  nameError?: string
}

/** Identity fields shared by onboarding and the dedicated profile editor. */
export function IdentityFields({
  draft,
  onChange,
  nameError,
}: IdentityFieldsProps) {
  return (
    <FieldGroup>
      <AvatarPicker
        displayName={draft.displayName}
        value={draft.avatarDataUrl}
        onChange={(avatarDataUrl) => onChange({ avatarDataUrl })}
      />
      <TextField
        label="Display name"
        value={draft.displayName}
        onChange={(displayName) => onChange({ displayName })}
        placeholder="What should we call you?"
        error={nameError}
        maxLength={80}
        isRequired
      />
      <ChoiceCards
        label="Strength-training experience"
        value={draft.trainingExperience}
        onChange={(trainingExperience) => onChange({ trainingExperience })}
        options={EXPERIENCE_OPTIONS}
      />
      <TextField
        label="Bio (optional)"
        value={draft.bio ?? ""}
        onChange={(bio) => onChange({ bio: bio || undefined })}
        placeholder="Your training focus, sport or current block"
        description={`${(draft.bio ?? "").length}/280 characters`}
        maxLength={280}
        multiline
      />
    </FieldGroup>
  )
}

interface AvatarPickerProps {
  displayName: string
  value?: string
  onChange: (dataUrl: string | undefined) => void
}

/** Local image picker with crop/downsize/re-encode before persistence. */
export function AvatarPicker({
  displayName,
  value,
  onChange,
}: AvatarPickerProps) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string>()

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(undefined)
    try {
      onChange(await prepareAvatar(file))
    } catch (cause) {
      setError(
        cause instanceof AvatarImageError
          ? cause.message
          : "That image couldn't be processed."
      )
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  return (
    <div className="flex flex-col items-start gap-4 min-[360px]:flex-row">
      <ProfileAvatar
        displayName={displayName}
        avatarDataUrl={value}
        size="hero"
      />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onPress={() => fileRef.current?.click()}
            isDisabled={busy}
          >
            <HugeiconsIcon
              icon={Camera01Icon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            {busy ? "Processing…" : value ? "Change photo" : "Add photo"}
          </Button>
          {value ? (
            <Button variant="ghost" onPress={() => onChange(undefined)}>
              <HugeiconsIcon
                icon={Delete02Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              Remove
            </Button>
          ) : null}
        </div>
        <FieldDescription>
          JPEG, PNG or WebP up to 8 MB. Cropped square and stored only on this
          device; profile photos are included in JSON backups.
        </FieldDescription>
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={AVATAR_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void onFile(event.target.files?.[0])}
      />
    </div>
  )
}
