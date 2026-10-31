import * as React from "react"
import { toast } from "sonner"

import { repositories } from "~/data/repositories"
import { useBodyComps, useBodyWeights, useUnits } from "~/hooks/use-data"
import type { DateKey } from "~/domain/dates"
import { formatDayLabel } from "~/domain/dates"
import { trendChange, weightTrend } from "~/domain/progress"
import { latestBodyFat } from "~/domain/body-comp"
import { formatWeight } from "~/domain/units"
import { Button } from "~/components/ui/button"
import { SectionCard } from "~/components/shared/cards"
import { WeightField } from "~/components/shared/weight-field"
import { BodyCompSheet } from "~/features/body/body-comp-sheet"

interface WeightLogCardProps {
  date: DateKey
  compact?: boolean
  /** Opens a parent-owned composition sheet; otherwise the card owns one. */
  onLogComposition?: () => void
}

/** Log the day's weigh-in (and body composition) and see the trend. Used on Today and Progress. */
export function WeightLogCard({ date, compact, onLogComposition }: WeightLogCardProps) {
  const weights = useBodyWeights()
  const comps = useBodyComps()
  const { weightUnit } = useUnits()
  const existing = weights?.find((w) => w.date === date)
  const last = weights?.at(-1)
  const [kg, setKg] = React.useState<number | null>(null)
  const [sheet, setSheet] = React.useState<number | null>(null)

  // Reset the draft when the day or stored value changes.
  React.useEffect(() => {
    setKg(existing?.kg ?? last?.kg ?? null)
  }, [existing?.kg, last?.kg, date])

  const trend = React.useMemo(() => weightTrend(weights ?? []), [weights])
  const latestTrend = trend.at(-1)
  const weekChange = trendChange(trend, 7)
  const bf = latestBodyFat(comps ?? [])

  const save = async () => {
    if (kg === null) return
    await repositories.bodyWeights.upsert(date, kg)
    toast.success(`Weight logged for ${formatDayLabel(date).toLowerCase()}`)
  }

  const parts = [
    latestTrend
      ? `Trend ${formatWeight(latestTrend.trendKg, weightUnit)}${weekChange !== undefined ? ` (${weekChange >= 0 ? "+" : "−"}${formatWeight(Math.abs(weekChange), weightUnit)} this week)` : ""}`
      : "Weigh in a few mornings a week for a reliable trend.",
    bf ? `${bf.bodyFatPct!.toFixed(1)}% body fat` : undefined,
  ].filter(Boolean)

  return (
    <SectionCard
      title="Body"
      description={parts.join(" · ")}
      action={
        <Button variant="ghost" size="sm" onPress={() => (onLogComposition ? onLogComposition() : setSheet(Date.now()))}>
          Log body fat
        </Button>
      }
    >
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <WeightField
          className="flex-1"
          label={existing ? `Logged for ${formatDayLabel(date).toLowerCase()}` : `Weigh-in for ${formatDayLabel(date).toLowerCase()}`}
          valueKg={kg}
          onChangeKg={setKg}
          increment={weightUnit === "lb" ? 0.2 : 0.1}
          min={weightUnit === "lb" ? 44 : 20}
          max={weightUnit === "lb" ? 880 : 400}
          showSteppers={!compact}
        />
        <Button type="submit" isDisabled={kg === null || (existing !== undefined && Math.abs(existing.kg - kg) < 1e-6)}>
          {existing ? "Update" : "Log"}
        </Button>
      </form>
      {sheet ? <BodyCompSheet key={sheet} date={date} onClose={() => setSheet(null)} /> : null}
    </SectionCard>
  )
}
