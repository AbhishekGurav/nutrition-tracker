import { useLiveQuery } from "dexie-react-hooks"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { RefreshIcon, User03Icon } from "@hugeicons/core-free-icons"

import type { Profile } from "~/domain/schemas"
import { repositories } from "~/data/repositories"
import { useProfile, useTargets } from "~/hooks/use-data"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { APP_NAME } from "~/components/layout/app-logo"
import { ButtonLink } from "~/components/shared/button-link"
import { SectionCard } from "~/components/shared/cards"
import { useConfirm } from "~/components/shared/confirm-dialog"
import { TargetsEditor } from "~/features/settings/targets-editor"
import {
  calculateForProfile,
  currentBodyState,
  recalculateTargets,
} from "~/features/settings/profile-service"
import { PreferencesSection } from "~/features/settings/preferences-section"

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
            <HugeiconsIcon
              icon={RefreshIcon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Recalculate
          </Button>
          <Button
            variant="ghost"
            onPress={() =>
              confirm.ask({
                title: "Reset all targets?",
                description:
                  "This clears every custom value and uses the estimate.",
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

export function SettingsPage() {
  const profile = useProfile()

  return (
    <>
      <PageHeader title="Settings" />
      <PageBody className="max-w-3xl">
        {profile === undefined ? (
          <Skeleton className="h-96" />
        ) : profile === null ? null : (
          <>
            <SectionCard
              title="Athlete profile"
              description={`${profile.displayName} · edit identity, photo, body stats, experience and body-composition goal.`}
              action={
                <ButtonLink to="/profile" variant="outline" size="sm">
                  <HugeiconsIcon
                    icon={User03Icon}
                    strokeWidth={2}
                    data-icon="inline-start"
                  />
                  Open profile
                </ButtonLink>
              }
            />
            <PreferencesSection profile={profile} />
            <TargetsSection profile={profile} />
            <SectionCard title={`About ${APP_NAME}`}>
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                <p>
                  Food values are derived from USDA FoodData Central (public
                  domain). Energy estimates use Katch-McArdle when body fat is
                  known, otherwise Mifflin-St Jeor. Tape estimates use the US
                  Navy formula; estimated 1RM uses the Epley formula.
                </p>
                <p>
                  Estimates are a starting point, not medical advice. Adjust
                  targets based on how your weight and body-composition trends
                  respond over 2–3 weeks.
                </p>
              </div>
            </SectionCard>
          </>
        )}
      </PageBody>
    </>
  )
}
