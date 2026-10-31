import * as React from "react"

import { Button } from "~/components/ui/button"
import { FieldSeparator } from "~/components/ui/field"
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "~/components/ui/progress"
import { SectionCard } from "~/components/shared/cards"
import { MacroChips } from "~/components/shared/macro-display"
import { APP_NAME, AppLogo } from "~/components/layout/app-logo"
import { ThemeToggle } from "~/components/layout/theme-toggle"
import { mergeTargets } from "~/domain/tdee"
import {
  ActivityFields,
  BodyStatsFields,
  GoalFields,
  InitialBodyFatFields,
  type BodyFatDraft,
} from "~/features/settings/profile-fields"
import { IdentityFields } from "~/features/profile/profile-identity-fields"
import {
  TargetsEditor,
  type TargetValues,
} from "~/features/settings/targets-editor"
import {
  calculateForProfile,
  completeOnboarding,
  defaultProfileDraft,
  type BodyState,
  type ProfileDraft,
} from "~/features/settings/profile-service"

const STEPS = [
  {
    title: "About you",
    description: "Used to estimate your daily energy needs.",
  },
  {
    title: "Activity",
    description: "Be honest; you can adjust targets later.",
  },
  {
    title: "Goal",
    description:
      "Set a body composition target, then pick the phase to get there.",
  },
  {
    title: "Your targets",
    description: "Estimated from your answers. Edit anything you like.",
  },
] as const

/** Four-step first run. Calls `onDone` after the profile and targets are saved. */
export function OnboardingFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = React.useState(0)
  const [draft, setDraft] = React.useState<ProfileDraft>(() =>
    defaultProfileDraft()
  )
  const [bodyFat, setBodyFat] = React.useState<BodyFatDraft>({
    bodyFatPct: null,
    method: "scale",
  })
  const [targets, setTargets] = React.useState<TargetValues | null>(null)
  const [saving, setSaving] = React.useState(false)
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  const state = React.useMemo<BodyState>(
    () => ({
      weightKg: draft.weightKg,
      bodyFatPct: bodyFat.bodyFatPct ?? undefined,
    }),
    [draft.weightKg, bodyFat.bodyFatPct]
  )
  const calculated = React.useMemo(
    () => calculateForProfile(draft, state),
    [draft, state]
  )
  const patch = (p: Partial<ProfileDraft>) => setDraft((d) => ({ ...d, ...p }))
  const isLast = step === STEPS.length - 1

  // Move focus to the step heading so screen readers announce the new step.
  React.useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  const next = async () => {
    if (step === STEPS.length - 2) {
      // Entering the review step: start from the estimate, keep earlier edits.
      setTargets((t) => mergeTargets(calculated, t ?? undefined))
    }
    if (!isLast) {
      setStep((s) => s + 1)
      return
    }
    setSaving(true)
    try {
      await completeOnboarding(
        draft,
        targets ?? mergeTargets(calculated, undefined),
        bodyFat.bodyFatPct !== null
          ? { bodyFatPct: bodyFat.bodyFatPct, method: bodyFat.method }
          : undefined
      )
      onDone()
    } finally {
      setSaving(false)
    }
  }

  const current = STEPS[step]

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center gap-3">
        <AppLogo className="size-9" />
        <div className="flex-1">
          <p className="text-base font-semibold">Welcome to {APP_NAME}</p>
          <p className="text-xs text-muted-foreground">
            Macros, lifting and supplements in one place.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <Progress
        value={step + 1}
        minValue={0}
        maxValue={STEPS.length}
        valueLabel={`Step ${step + 1} of ${STEPS.length}`}
      >
        <ProgressLabel>Setup</ProgressLabel>
        <ProgressValue />
      </Progress>

      <SectionCard
        title={
          <span ref={headingRef} tabIndex={-1} className="outline-none">
            {current.title}
          </span>
        }
        description={current.description}
      >
        {step === 0 ? (
          <div className="flex flex-col gap-4">
            <IdentityFields draft={draft} onChange={patch} />
            <FieldSeparator />
            <BodyStatsFields draft={draft} onChange={patch} />
            <FieldSeparator />
            <InitialBodyFatFields value={bodyFat} onChange={setBodyFat} />
          </div>
        ) : null}
        {step === 1 ? <ActivityFields draft={draft} onChange={patch} /> : null}
        {step === 2 ? (
          <GoalFields draft={draft} onChange={patch} state={state} />
        ) : null}
        {step === 3 && targets ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Estimated maintenance:{" "}
              <span className="font-medium text-foreground">
                {calculated.tdee.toLocaleString()} kcal
              </span>
              {calculated.method === "katch" ? " (from your lean mass)" : ""}.
              Goal average:{" "}
              <span className="font-medium text-foreground">
                {calculated.goalKcal.toLocaleString()} kcal
              </span>
              .
            </p>
            <TargetsEditor
              value={targets}
              calculated={calculated}
              onChange={setTargets}
            />
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span>
                Training day: <MacroChips macros={targets.training} />
              </span>
              <span>
                Rest day: <MacroChips macros={targets.rest} />
              </span>
            </div>
          </div>
        ) : null}
      </SectionCard>

      <div className="mt-auto flex gap-2">
        {step > 0 ? (
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onPress={() => setStep((s) => s - 1)}
          >
            Back
          </Button>
        ) : null}
        <Button
          size="lg"
          className="flex-1"
          onPress={() => void next()}
          isDisabled={saving || (step === 0 && !draft.displayName.trim())}
        >
          {isLast ? (saving ? "Saving…" : "Start tracking") : "Continue"}
        </Button>
      </div>
    </div>
  )
}
