import {
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "~/components/ui/field"
import { Switch } from "~/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { ChoiceCards, ChoiceGroup } from "~/components/shared/choice"
import { DateField } from "~/components/shared/date-field"
import { NumberField } from "~/components/shared/number-field"
import { WeightField } from "~/components/shared/weight-field"
import type {
  ActivityLevel,
  BodyCompMethod,
  BodyGoal,
  Goal,
  Sex,
  UnitSystem,
} from "~/domain/schemas"
import { BODY_COMP_METHODS } from "~/domain/schemas"
import {
  ACTIVITY_LABELS,
  DEFAULT_PROTEIN_PER_KG,
  DEFAULT_PROTEIN_PER_KG_LEAN,
  GOAL_LABELS,
} from "~/domain/tdee"
import { composition, METHOD_LABELS } from "~/domain/body-comp"
import { addDays, todayKey } from "~/domain/dates"
import {
  cmToFeetInches,
  feetInchesToCm,
  KG_PER_LB,
  round,
  weightUnitFor,
} from "~/domain/units"
import {
  planForProfile,
  type BodyState,
  type ProfileDraft,
} from "~/features/settings/profile-service"
import { GoalPlanSummary } from "~/features/body/goal-plan-summary"

interface FieldsProps {
  draft: ProfileDraft
  onChange: (patch: Partial<ProfileDraft>) => void
  showUnits?: boolean
}

export const UNIT_OPTIONS = [
  { value: "metric", label: "Metric (kg, cm)" },
  { value: "imperial", label: "Imperial (lb, ft)" },
] as const satisfies readonly { value: UnitSystem; label: string }[]

const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const satisfies readonly { value: Sex; label: string }[]

const ACTIVITY_OPTIONS = (Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(
  (value) => ({
    value,
    label: ACTIVITY_LABELS[value].label,
    hint: ACTIVITY_LABELS[value].hint,
  })
)

const GOAL_OPTIONS = (Object.keys(GOAL_LABELS) as Goal[]).map((value) => ({
  value,
  label: GOAL_LABELS[value].label,
  hint: GOAL_LABELS[value].hint,
}))

function HeightField({ draft, onChange }: FieldsProps) {
  if (draft.unitSystem === "metric") {
    return (
      <NumberField
        label="Height"
        unit="cm"
        value={round(draft.heightCm, 0)}
        onChange={(v) => v !== null && onChange({ heightCm: v })}
        min={100}
        max={250}
        decimals={0}
      />
    )
  }
  const { feet, inches } = cmToFeetInches(draft.heightCm)
  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label">Height</FieldLegend>
      <div className="grid grid-cols-2 gap-2">
        <NumberField
          aria-label="Feet"
          unit="ft"
          value={feet}
          onChange={(v) =>
            v !== null && onChange({ heightCm: feetInchesToCm(v, inches) })
          }
          min={3}
          max={8}
          decimals={0}
        />
        <NumberField
          aria-label="Inches"
          unit="in"
          value={inches}
          onChange={(v) =>
            v !== null && onChange({ heightCm: feetInchesToCm(feet, v) })
          }
          min={0}
          max={11}
          decimals={0}
        />
      </div>
    </FieldSet>
  )
}

export function UnitsField({ draft, onChange }: FieldsProps) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Units</FieldLabel>
      <ChoiceGroup
        aria-label="Units"
        value={draft.unitSystem}
        onChange={(unitSystem) => onChange({ unitSystem })}
        options={UNIT_OPTIONS}
      />
    </div>
  )
}

export function BodyStatsFields({
  draft,
  onChange,
  showUnits = true,
}: FieldsProps) {
  return (
    <FieldGroup>
      {showUnits ? <UnitsField draft={draft} onChange={onChange} /> : null}
      <div className="flex flex-col gap-2">
        <FieldLabel>Sex</FieldLabel>
        <ChoiceGroup
          aria-label="Sex"
          value={draft.sex}
          onChange={(sex) => onChange({ sex })}
          options={SEX_OPTIONS}
        />
        <FieldDescription>Used only for the energy estimate.</FieldDescription>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Birth year"
          value={draft.birthYear}
          onChange={(v) => v !== null && onChange({ birthYear: v })}
          min={1920}
          max={new Date().getFullYear() - 13}
          decimals={0}
          showSteppers={false}
        />
        <WeightField
          label="Body weight"
          unit={weightUnitFor(draft.unitSystem)}
          valueKg={draft.weightKg}
          onChangeKg={(kg) => kg !== null && onChange({ weightKg: kg })}
          increment={draft.unitSystem === "imperial" ? 1 : 0.5}
          min={draft.unitSystem === "imperial" ? 66 : 30}
          max={draft.unitSystem === "imperial" ? 770 : 350}
        />
      </div>
      <HeightField draft={draft} onChange={onChange} />
    </FieldGroup>
  )
}

export function ActivityFields({ draft, onChange }: FieldsProps) {
  return (
    <FieldGroup>
      <ChoiceCards
        label="Daily activity, including training"
        value={draft.activityLevel}
        onChange={(activityLevel) => onChange({ activityLevel })}
        options={ACTIVITY_OPTIONS}
      />
      <NumberField
        label="Lifting sessions per week"
        value={draft.trainingDaysPerWeek}
        onChange={(v) => v !== null && onChange({ trainingDaysPerWeek: v })}
        min={0}
        max={7}
        decimals={0}
        description="Training days get a few more carbs; rest days a few less. Your weekly average stays the same."
      />
    </FieldGroup>
  )
}

/** Patch for a phase change: protein defaults follow unless the user already customised them. */
export function phasePatch(
  draft: ProfileDraft,
  goal: Goal
): Partial<ProfileDraft> {
  const lean = draft.proteinPerKgLean
  return {
    goal,
    proteinPerKg:
      draft.proteinPerKg === DEFAULT_PROTEIN_PER_KG[draft.goal]
        ? DEFAULT_PROTEIN_PER_KG[goal]
        : draft.proteinPerKg,
    proteinPerKgLean:
      lean === undefined || lean === DEFAULT_PROTEIN_PER_KG_LEAN[draft.goal]
        ? undefined
        : lean,
  }
}

interface GoalFieldsProps extends FieldsProps {
  /** Current body state; enables lean-mass protein and the composition goal. */
  state: BodyState
}

export function GoalFields({ draft, onChange, state }: GoalFieldsProps) {
  const hasBodyFat = state.bodyFatPct !== undefined
  const perLb = round(draft.proteinPerKg * KG_PER_LB, 2)
  const leanValue =
    draft.proteinPerKgLean ?? DEFAULT_PROTEIN_PER_KG_LEAN[draft.goal]
  const leanKg = hasBodyFat
    ? composition(state.weightKg, state.bodyFatPct!).leanKg
    : undefined

  return (
    <FieldGroup>
      <BodyGoalFields draft={draft} onChange={onChange} state={state} />
      <ChoiceCards
        label="Phase"
        value={draft.goal}
        onChange={(goal) => onChange(phasePatch(draft, goal))}
        options={GOAL_OPTIONS}
      />
      {hasBodyFat ? (
        <NumberField
          label="Protein per kg of lean mass"
          unit="g/kg"
          value={leanValue}
          onChange={(v) => v !== null && onChange({ proteinPerKgLean: v })}
          increment={0.1}
          min={1}
          max={4}
          decimals={1}
          description={`2.2–2.6 g/kg of lean mass suits most lifters, more in a deficit. That's ${Math.round(leanValue * (leanKg ?? 0))} g a day for your ${Math.round(leanKg ?? 0)} kg lean mass.`}
        />
      ) : (
        <NumberField
          label="Protein per kg of body weight"
          unit="g/kg"
          value={draft.proteinPerKg}
          onChange={(v) => v !== null && onChange({ proteinPerKg: v })}
          increment={0.1}
          min={1}
          max={3.5}
          decimals={1}
          description={`1.6–2.2 g/kg suits most lifters (${perLb} g per lb). Log your body fat % to base this on lean mass instead.`}
        />
      )}
    </FieldGroup>
  )
}

/** Sensible starting goal: 5 points leaner (not below a healthy floor) at today's lean mass. */
export function defaultBodyGoal(sex: Sex, state: BodyState): BodyGoal {
  const bf = state.bodyFatPct ?? (sex === "male" ? 20 : 28)
  const floor = sex === "male" ? 10 : 18
  return {
    targetBodyFatPct: Math.max(floor, Math.round(bf - 5)),
    targetLeanKg: round(composition(state.weightKg, bf).leanKg, 1),
  }
}

function BodyGoalFields({ draft, onChange, state }: GoalFieldsProps) {
  const unit = weightUnitFor(draft.unitSystem)
  const goal = draft.bodyGoal
  const plan = planForProfile(draft, state)
  const today = todayKey()
  const set = (patch: Partial<BodyGoal>) =>
    goal && onChange({ bodyGoal: { ...goal, ...patch } })

  return (
    <FieldSet className="gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <FieldLegend variant="label" className="mb-0">
            Body composition goal
          </FieldLegend>
          <FieldDescription>
            Set a body fat % and lean mass to aim for. Target weight follows
            from them.
          </FieldDescription>
        </div>
        <Switch
          aria-label="Set a body composition goal"
          isSelected={goal !== undefined}
          onChange={(on) =>
            onChange({
              bodyGoal: on ? defaultBodyGoal(draft.sex, state) : undefined,
            })
          }
        />
      </div>
      {goal ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              label="Target body fat"
              unit="%"
              value={goal.targetBodyFatPct}
              onChange={(v) => v !== null && set({ targetBodyFatPct: v })}
              min={3}
              max={60}
              decimals={1}
              increment={0.5}
            />
            <WeightField
              label="Target lean mass"
              unit={unit}
              valueKg={goal.targetLeanKg}
              onChangeKg={(kg) => kg !== null && set({ targetLeanKg: kg })}
              increment={unit === "lb" ? 1 : 0.5}
              min={unit === "lb" ? 44 : 20}
              max={unit === "lb" ? 440 : 200}
              description="Everything except fat: muscle, bone, water, organs."
            />
          </div>
          <DateField
            label="Target date (optional)"
            value={goal.targetDate}
            min={addDays(today, 7)}
            onChange={(targetDate) => set({ targetDate })}
            description="Sets your weekly pace and calorie deficit or surplus."
          />
          {plan ? (
            <GoalPlanSummary
              plan={plan}
              unit={unit}
              phase={draft.goal}
              onUsePhase={(g) => onChange({ ...phasePatch(draft, g) })}
              onUseDate={(d) => set({ targetDate: d })}
            />
          ) : (
            <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Add a body fat reading to see your plan: in Progress → Body, or a
              smart-scale or tape estimate.
            </p>
          )}
        </>
      ) : null}
    </FieldSet>
  )
}

export interface BodyFatDraft {
  bodyFatPct: number | null
  method: BodyCompMethod
}

/** Optional current body fat for onboarding. */
export function InitialBodyFatFields({
  value,
  onChange,
}: {
  value: BodyFatDraft
  onChange: (v: BodyFatDraft) => void
}) {
  return (
    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
      <NumberField
        label="Body fat (optional)"
        unit="%"
        value={value.bodyFatPct}
        onChange={(bodyFatPct) => onChange({ ...value, bodyFatPct })}
        min={3}
        max={60}
        decimals={1}
        showSteppers={false}
        placeholder="Skip if unknown"
        description="Makes calorie and protein targets more accurate. You can add it later."
      />
      <MethodSelect
        value={value.method}
        onChange={(method) => onChange({ ...value, method })}
      />
    </div>
  )
}

export function MethodSelect({
  value,
  onChange,
}: {
  value: BodyCompMethod
  onChange: (m: BodyCompMethod) => void
}) {
  return (
    <Select
      value={value}
      onChange={(k) => {
        const m = BODY_COMP_METHODS.find((x) => x === k)
        if (m) onChange(m)
      }}
      className="flex w-full flex-col gap-2"
    >
      <FieldLabel>Measured with</FieldLabel>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {BODY_COMP_METHODS.map((m) => (
            <SelectItem key={m} id={m} textValue={METHOD_LABELS[m].label}>
              {METHOD_LABELS[m].label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
