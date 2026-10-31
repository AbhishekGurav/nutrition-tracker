import { useTheme } from "next-themes"

import type { Profile } from "~/domain/schemas"
import { repositories } from "~/data/repositories"
import { FieldDescription, FieldGroup, FieldLabel } from "~/components/ui/field"
import { SectionCard } from "~/components/shared/cards"
import { ChoiceGroup } from "~/components/shared/choice"
import { UNIT_OPTIONS } from "~/features/settings/profile-fields"
import { PalettePicker } from "~/features/settings/palette-picker"

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const

/** Appearance and units, shared by Settings and the profile page. */
export function PreferencesSection({ profile }: { profile: Profile }) {
  const { theme = "system", setTheme } = useTheme()
  const themeValue =
    THEME_OPTIONS.find((option) => option.value === theme)?.value ?? "system"

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
              const {
                id: _id,
                createdAt: _createdAt,
                updatedAt: _updatedAt,
                ...rest
              } = profile
              void repositories.profile.save({ ...rest, unitSystem })
            }}
          />
          <FieldDescription>
            Data is stored in kg and grams, so switching never loses precision.
          </FieldDescription>
        </div>
        <div className="flex flex-col gap-2">
          <FieldLabel>Mode</FieldLabel>
          <ChoiceGroup
            aria-label="Mode"
            value={themeValue}
            options={THEME_OPTIONS}
            onChange={setTheme}
          />
        </div>
      </FieldGroup>
    </SectionCard>
  )
}
