import type { Goal } from "~/domain/schemas"
import { comfortableWeeks, type BodyGoalPlan, type Feasibility } from "~/domain/body-comp"
import { addDays, formatShortDate, todayKey } from "~/domain/dates"
import { formatWeight, type WeightUnit } from "~/domain/units"
import { GOAL_LABELS } from "~/domain/tdee"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"

const FEASIBILITY: Record<Feasibility, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  comfortable: { label: "Realistic pace", variant: "default" },
  ambitious: { label: "Ambitious", variant: "secondary" },
  unrealistic: { label: "Too fast", variant: "destructive" },
}

const signed = (kg: number, unit: WeightUnit) => `${kg >= 0 ? "+" : "−"}${formatWeight(Math.abs(kg), unit)}`

interface GoalPlanSummaryProps {
  plan: BodyGoalPlan
  unit: WeightUnit
  /** The phase currently selected; shows a nudge when it differs from the suggestion. */
  phase?: Goal
  onUsePhase?: (phase: Goal) => void
  onUseDate?: (date: string) => void
}

/** What the goal means in kilograms, the pace it needs and whether that's realistic. */
export function GoalPlanSummary({ plan, unit, phase, onUsePhase, onUseDate }: GoalPlanSummaryProps) {
  const weeksNeeded = comfortableWeeks(plan)
  const suggestedDate = weeksNeeded > 0 ? addDays(todayKey(), weeksNeeded * 7) : undefined
  const items = [
    { label: "Target weight", value: formatWeight(plan.targetWeightKg, unit), sub: signed(plan.weightChangeKg, unit) },
    { label: "Fat mass", value: formatWeight(plan.target.fatKg, unit), sub: signed(plan.fatChangeKg, unit) },
    { label: "Lean mass", value: formatWeight(plan.target.leanKg, unit), sub: signed(plan.leanChangeKg, unit) },
  ]

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-muted/50 p-3" aria-live="polite">
      <dl className="grid grid-cols-3 gap-2">
        {items.map((i) => (
          <div key={i.label} className="min-w-0">
            <dt className="text-[0.6875rem] text-muted-foreground">{i.label}</dt>
            <dd className="text-sm font-semibold tabular-nums">{i.value}</dd>
            <dd className="text-[0.6875rem] text-muted-foreground tabular-nums">{i.sub}</dd>
          </div>
        ))}
      </dl>

      {plan.weekly && plan.weeks ? (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {plan.feasibility ? <Badge variant={FEASIBILITY[plan.feasibility].variant}>{FEASIBILITY[plan.feasibility].label}</Badge> : null}
          <span className="tabular-nums text-muted-foreground">
            {Math.round(plan.weeks)} weeks · {signed(plan.weekly.weightKg, unit)}/week
            {plan.weekly.fatKg < 0 ? ` (fat ${signed(plan.weekly.fatKg, unit)})` : ""}
          </span>
        </div>
      ) : suggestedDate ? (
        <p className="text-xs text-muted-foreground">
          At a comfortable pace this takes about {weeksNeeded} weeks.
        </p>
      ) : null}

      {plan.notes.map((n) => (
        <p key={n} className="text-xs text-muted-foreground">
          {n}
        </p>
      ))}

      <div className="flex flex-wrap gap-2">
        {onUseDate && suggestedDate && plan.feasibility !== "comfortable" ? (
          <Button variant="outline" size="sm" onPress={() => onUseDate(suggestedDate)}>
            Use {formatShortDate(suggestedDate)} ({weeksNeeded} wk)
          </Button>
        ) : null}
        {onUsePhase && phase !== undefined && phase !== plan.suggestedPhase ? (
          <Button variant="outline" size="sm" onPress={() => onUsePhase(plan.suggestedPhase)}>
            Switch phase to {GOAL_LABELS[plan.suggestedPhase].label}
          </Button>
        ) : null}
      </div>
      {phase !== undefined && phase === plan.suggestedPhase ? (
        <p className="text-xs text-muted-foreground">Phase matches this goal: {GOAL_LABELS[phase].label.toLowerCase()}.</p>
      ) : null}
    </div>
  )
}
