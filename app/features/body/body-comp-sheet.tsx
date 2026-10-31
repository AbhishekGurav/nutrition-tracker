import * as React from "react"
import { toast } from "sonner"

import type { BodyComp, BodyCompMethod } from "~/domain/schemas"
import { composition, METHOD_LABELS, navyBodyFat } from "~/domain/body-comp"
import { formatDayLabel, type DateKey } from "~/domain/dates"
import { formatWeight } from "~/domain/units"
import { repositories } from "~/data/repositories"
import { useBodyComps, useBodyWeights, useProfile, useUnits } from "~/hooks/use-data"
import { Button } from "~/components/ui/button"
import { FieldDescription, FieldGroup } from "~/components/ui/field"
import { LengthField } from "~/components/shared/length-field"
import { NumberField } from "~/components/shared/number-field"
import { ResponsiveSheet } from "~/components/shared/responsive-sheet"
import { WeightField } from "~/components/shared/weight-field"
import { MethodSelect } from "~/features/settings/profile-fields"
import { recalculateTargets } from "~/features/settings/profile-service"

interface BodyCompSheetProps {
  date: DateKey
  onClose: () => void
  /** Edit an existing reading. */
  entry?: BodyComp
}

interface Draft {
  method: BodyCompMethod
  weightKg: number | null
  bodyFatPct: number | null
  muscleMassKg: number | null
  waistCm: number | null
  neckCm: number | null
  hipCm: number | null
}

/**
 * Log a body-composition reading. Device and scan methods take body fat %
 * and muscle mass as reported; the tape method estimates body fat from
 * waist, neck (and hips for women).
 */
export function BodyCompSheet({ date, onClose, entry }: BodyCompSheetProps) {
  const profile = useProfile()
  const weights = useBodyWeights()
  const comps = useBodyComps()
  const { weightUnit } = useUnits()
  const [error, setError] = React.useState<string>()

  // Default to the method the user logged last.
  const lastMethod = comps?.at(-1)?.method
  const dayWeight = weights?.find((w) => w.date === date)?.kg ?? weights?.at(-1)?.kg
  const [draft, setDraft] = React.useState<Draft | null>(null)
  React.useEffect(() => {
    if (draft || weights === undefined || comps === undefined) return
    setDraft({
      method: entry?.method ?? lastMethod ?? "scale",
      weightKg: entry?.weightKg ?? dayWeight ?? profile?.weightKg ?? null,
      bodyFatPct: entry?.bodyFatPct ?? null,
      muscleMassKg: entry?.muscleMassKg ?? null,
      waistCm: entry?.waistCm ?? null,
      neckCm: entry?.neckCm ?? null,
      hipCm: entry?.hipCm ?? null,
    })
  }, [draft, weights, comps, entry, lastMethod, dayWeight, profile?.weightKg])

  const patch = (p: Partial<Draft>) => {
    setDraft((d) => (d ? { ...d, ...p } : d))
    setError(undefined)
  }

  const isTape = draft?.method === "tape"
  const sex = profile?.sex ?? "male"
  const navy =
    draft && isTape && profile
      ? navyBodyFat(sex, profile.heightCm, {
          waistCm: draft.waistCm ?? undefined,
          neckCm: draft.neckCm ?? undefined,
          hipCm: draft.hipCm ?? undefined,
        })
      : undefined
  const bodyFatPct = isTape ? navy : (draft?.bodyFatPct ?? undefined)
  const comp = draft?.weightKg && bodyFatPct !== undefined ? composition(draft.weightKg, bodyFatPct) : undefined

  const save = async () => {
    if (!draft) return
    if (!draft.weightKg) return setError("Enter your weight for this reading.")
    if (isTape && navy === undefined) {
      return setError(sex === "female" ? "Enter waist, neck and hips (waist larger than neck)." : "Enter waist and neck (waist larger than neck).")
    }
    if (!isTape && draft.bodyFatPct === null && draft.muscleMassKg === null) {
      return setError("Enter body fat %, muscle mass, or both.")
    }
    const opt = (v: number | null) => v ?? undefined
    // Changing an entry's method moves it to the new method's slot.
    if (entry && entry.method !== draft.method) await repositories.bodyComps.remove(entry.id)
    await repositories.bodyComps.upsert(date, draft.method, {
      weightKg: draft.weightKg,
      bodyFatPct: bodyFatPct,
      muscleMassKg: isTape ? undefined : opt(draft.muscleMassKg),
      waistCm: isTape ? opt(draft.waistCm) : undefined,
      neckCm: isTape ? opt(draft.neckCm) : undefined,
      hipCm: isTape && sex === "female" ? opt(draft.hipCm) : undefined,
    })
    // A scan's weight shouldn't overwrite the day's own weigh-in; fill it only if missing.
    if (!weights?.some((w) => w.date === date)) await repositories.bodyWeights.upsert(date, draft.weightKg)
    if (bodyFatPct !== undefined) await recalculateTargets()
    toast.success(`Body composition logged for ${formatDayLabel(date).toLowerCase()}`)
    onClose()
  }

  return (
    <ResponsiveSheet
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title={entry ? "Edit measurement" : "Log body composition"}
      description={`For ${formatDayLabel(date).toLowerCase()}. Compare readings from the same method; methods can differ by several percent.`}
      footer={
        <Button size="lg" onPress={() => void save()} isDisabled={!draft}>
          Save
        </Button>
      }
    >
      {draft ? (
        <FieldGroup>
          <MethodSelect value={draft.method} onChange={(method) => patch({ method })} />
          <FieldDescription>{METHOD_LABELS[draft.method].hint}.</FieldDescription>
          <WeightField
            label="Weight at the reading"
            valueKg={draft.weightKg}
            onChangeKg={(weightKg) => patch({ weightKg })}
            increment={weightUnit === "lb" ? 0.2 : 0.1}
            min={weightUnit === "lb" ? 44 : 20}
            max={weightUnit === "lb" ? 880 : 400}
            showSteppers={false}
          />

          {isTape ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <LengthField
                  label="Waist"
                  valueCm={draft.waistCm}
                  onChangeCm={(waistCm) => patch({ waistCm })}
                  min={0}
                  max={250}
                  showSteppers={false}
                  description={sex === "male" ? "At the navel, relaxed" : "Narrowest point"}
                />
                <LengthField
                  label="Neck"
                  valueCm={draft.neckCm}
                  onChangeCm={(neckCm) => patch({ neckCm })}
                  min={0}
                  max={80}
                  showSteppers={false}
                  description="Just below the larynx"
                />
                {sex === "female" ? (
                  <LengthField
                    label="Hips"
                    valueCm={draft.hipCm}
                    onChangeCm={(hipCm) => patch({ hipCm })}
                    min={0}
                    max={250}
                    showSteppers={false}
                    description="Widest point"
                  />
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Uses your height from your profile. Measure the same way each time, ideally in the morning.
              </p>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Body fat"
                unit="%"
                value={draft.bodyFatPct}
                onChange={(bodyFatPct) => patch({ bodyFatPct })}
                min={2}
                max={70}
                decimals={1}
                showSteppers={false}
              />
              <WeightField
                label="Muscle mass"
                valueKg={draft.muscleMassKg}
                onChangeKg={(muscleMassKg) => patch({ muscleMassKg })}
                min={weightUnit === "lb" ? 11 : 5}
                max={weightUnit === "lb" ? 440 : 200}
                showSteppers={false}
                description="As your device reports it (optional)"
              />
            </div>
          )}

          {comp && bodyFatPct !== undefined ? (
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3 text-sm" aria-live="polite">
              <div>
                <p className="text-[0.6875rem] text-muted-foreground">Body fat</p>
                <p className="font-semibold tabular-nums">{bodyFatPct.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-[0.6875rem] text-muted-foreground">Fat mass</p>
                <p className="font-semibold tabular-nums">{formatWeight(comp.fatKg, weightUnit)}</p>
              </div>
              <div>
                <p className="text-[0.6875rem] text-muted-foreground">Lean mass</p>
                <p className="font-semibold tabular-nums">{formatWeight(comp.leanKg, weightUnit)}</p>
              </div>
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </FieldGroup>
      ) : null}
    </ResponsiveSheet>
  )
}
