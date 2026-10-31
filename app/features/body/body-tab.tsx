import * as React from "react"
import { toast } from "sonner"
import type { Key } from "react-aria-components"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import {
  Delete02Icon,
  PencilEdit01Icon,
  Target02Icon,
} from "@hugeicons/core-free-icons"

import type { BodyComp, BodyCompMethod } from "~/domain/schemas"
import {
  addDays,
  formatDayLabel,
  formatShortDate,
  todayKey,
} from "~/domain/dates"
import { trendChange, weightTrend } from "~/domain/progress"
import {
  composition,
  compositionSeries,
  latestBodyFat,
  METHOD_LABELS,
  methodsInUse,
  planBodyGoal,
} from "~/domain/body-comp"
import { formatWeight, toDisplayWeight } from "~/domain/units"
import { repositories } from "~/data/repositories"
import {
  useBodyComps,
  useBodyWeights,
  useProfile,
  useUnits,
} from "~/hooks/use-data"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Skeleton } from "~/components/ui/skeleton"
import { ButtonLink } from "~/components/shared/button-link"
import {
  ChartCard,
  EmptyState,
  SectionCard,
  StatCard,
} from "~/components/shared/cards"
import { ChoiceGroup } from "~/components/shared/choice"
import { ListRow, RowList } from "~/components/shared/list-row"
import { WeightLogCard } from "~/features/progress/weight-log-card"
import { BodyCompSheet } from "~/features/body/body-comp-sheet"
import { GoalPlanSummary } from "~/features/body/goal-plan-summary"

const RANGE_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
] as const

const weightChartConfig = {
  kg: { label: "Weigh-in", color: "var(--muted-foreground)" },
  trend: { label: "Trend", color: "var(--macro-kcal)" },
} satisfies ChartConfig
const bfConfig = {
  bodyFatPct: { label: "Body fat %", color: "var(--macro-fat)" },
} satisfies ChartConfig
const massConfig = {
  leanKg: { label: "Lean mass", color: "var(--macro-protein)" },
  fatKg: { label: "Fat mass", color: "var(--macro-fat)" },
} satisfies ChartConfig

const signed = (n: number, fmt: (v: number) => string) =>
  `${n >= 0 ? "+" : "−"}${fmt(Math.abs(n))}`
const dayLabel = (
  _: unknown,
  p: readonly { payload?: { date?: string } }[] | undefined
) => formatDayLabel(String(p?.[0]?.payload?.date ?? ""))

export function BodyTab() {
  const weights = useBodyWeights()
  const comps = useBodyComps()
  const profile = useProfile()
  const { weightUnit } = useUnits()
  const [range, setRange] = React.useState<"30" | "90" | "365">("90")
  const [methodPick, setMethodPick] = React.useState<BodyCompMethod>()
  const [sheet, setSheet] = React.useState<{
    key: number
    entry?: BodyComp
  } | null>(null)
  const trend = React.useMemo(() => weightTrend(weights ?? []), [weights])

  if (!weights || !comps || profile === undefined)
    return <Skeleton className="h-96" />

  const fmt = (kg: number) => formatWeight(kg, weightUnit)
  const today = todayKey()
  const cutoff = addDays(today, -Number(range))
  const latestTrend = trend.at(-1)
  const currentWeight = weights.at(-1)?.kg ?? profile?.weightKg
  const bf = latestBodyFat(comps)
  const comp =
    bf && currentWeight ? composition(currentWeight, bf.bodyFatPct!) : undefined
  const latestMuscle = [...comps]
    .reverse()
    .find((c) => c.muscleMassKg !== undefined)
  const plan =
    profile?.bodyGoal && bf && currentWeight
      ? planBodyGoal(
          { weightKg: currentWeight, bodyFatPct: bf.bodyFatPct! },
          profile.bodyGoal,
          today
        )
      : undefined

  const methods = methodsInUse(comps.filter((c) => c.bodyFatPct !== undefined))
  const method =
    methodPick && methods.includes(methodPick) ? methodPick : methods[0]
  const series = method
    ? compositionSeries(comps, method).filter((p) => p.date >= cutoff)
    : []
  const compData = series.map((p) => ({
    date: p.date,
    bodyFatPct: Math.round(p.bodyFatPct * 10) / 10,
    leanKg: toDisplayWeight(p.leanKg, weightUnit),
    fatKg: toDisplayWeight(p.fatKg, weightUnit),
  }))
  const firstInRange = series[0]
  const lastInRange = series.at(-1)

  const weightData = trend
    .filter((p) => p.date >= cutoff)
    .map((p) => ({
      date: p.date,
      kg: toDisplayWeight(p.kg, weightUnit),
      trend: toDisplayWeight(p.trendKg, weightUnit),
    }))
  const w30 = trendChange(trend, 30)

  const rangeControl = (
    <ChoiceGroup
      aria-label="Range"
      value={range}
      onChange={setRange}
      options={RANGE_OPTIONS}
      size="sm"
      fill={false}
    />
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Weight trend"
          value={latestTrend ? fmt(latestTrend.trendKg) : "–"}
          hint={
            w30 !== undefined ? `${signed(w30, fmt)} in 30 days` : undefined
          }
        />
        <StatCard
          label="Body fat"
          value={bf ? `${bf.bodyFatPct!.toFixed(1)}%` : "–"}
          hint={
            bf
              ? `${METHOD_LABELS[bf.method].label}, ${formatDayLabel(bf.date).toLowerCase()}`
              : "No reading yet"
          }
        />
        <StatCard
          label="Lean mass"
          value={comp ? fmt(comp.leanKg) : "–"}
          hint={comp ? "Weight minus fat" : undefined}
        />
        <StatCard
          label="Fat mass"
          value={comp ? fmt(comp.fatKg) : "–"}
          hint={
            latestMuscle
              ? `Device muscle mass ${fmt(latestMuscle.muscleMassKg!)}`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-4">
          <SectionCard
            title="Goal"
            description={
              profile?.bodyGoal
                ? `${profile.bodyGoal.targetBodyFatPct}% body fat with ${fmt(profile.bodyGoal.targetLeanKg)} lean mass${profile.bodyGoal.targetDate ? ` by ${formatShortDate(profile.bodyGoal.targetDate)}` : ""}`
                : undefined
            }
            action={
              <ButtonLink to="/settings" variant="ghost" size="sm">
                {profile?.bodyGoal ? "Edit" : "Set goal"}
              </ButtonLink>
            }
          >
            {!profile?.bodyGoal ? (
              <EmptyState
                icon={Target02Icon}
                title="No body composition goal"
                description="Set a target body fat % and lean mass. The app works out your target weight, pace and phase."
                className="py-4"
              />
            ) : plan ? (
              <GoalPlanSummary
                plan={plan}
                unit={weightUnit}
                phase={profile.goal}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Log a body fat reading to track progress toward your goal.
              </p>
            )}
          </SectionCard>
          <WeightLogCard
            date={today}
            onLogComposition={() => setSheet({ key: Date.now() })}
          />
        </div>

        <ChartCard
          title="Body fat %"
          description={
            firstInRange && lastInRange && firstInRange !== lastInRange
              ? `${signed(lastInRange.bodyFatPct - firstInRange.bodyFatPct, (v) => `${v.toFixed(1)} pts`)} · lean ${signed(lastInRange.leanKg - firstInRange.leanKg, fmt)} · fat ${signed(lastInRange.fatKg - firstInRange.fatKg, fmt)}`
              : "One method at a time; methods don't compare well."
          }
          action={
            methods.length > 1 ? (
              <Select
                aria-label="Method"
                value={method ?? null}
                onChange={(k: Key | null) =>
                  setMethodPick(methods.find((m) => m === k))
                }
                className="w-40"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {methods.map((m) => (
                      <SelectItem
                        key={m}
                        id={m}
                        textValue={METHOD_LABELS[m].label}
                      >
                        {METHOD_LABELS[m].label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : null
          }
          isEmpty={compData.length < 2}
          emptyDescription="Log body fat at least twice with the same method. Weekly is plenty."
        >
          <div className="flex flex-col gap-4">
            <ChartContainer
              config={bfConfig}
              className="aspect-auto h-48 w-full"
              role="img"
              aria-label={`Body fat chart, ${method ? METHOD_LABELS[method].label : ""}. Latest ${lastInRange?.bodyFatPct.toFixed(1) ?? "unknown"} percent.`}
            >
              <LineChart data={compData} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                  tickFormatter={(v: number) => String(Math.round(v))}
                />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={dayLabel} />}
                />
                <Line
                  dataKey="bodyFatPct"
                  type="monotone"
                  stroke="var(--color-bodyFatPct)"
                  strokeWidth={2.5}
                  dot={{ r: 2.5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
            <ChartContainer
              config={massConfig}
              className="aspect-auto h-48 w-full"
              role="img"
              aria-label="Lean and fat mass over time"
            >
              <LineChart data={compData} margin={{ left: 0, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatShortDate}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(v: number) => String(Math.round(v))}
                />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={dayLabel} />}
                />
                <Line
                  dataKey="leanKg"
                  type="monotone"
                  stroke="var(--color-leanKg)"
                  strokeWidth={2.5}
                  dot={{ r: 2.5 }}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="fatKg"
                  type="monotone"
                  stroke="var(--color-fatKg)"
                  strokeWidth={2.5}
                  dot={{ r: 2.5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <SectionCard
          title="Measurements"
          description={
            comps.length
              ? `${comps.length} readings`
              : "Smart scale, scans, calipers or tape."
          }
        >
          {comps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No body composition readings yet.
            </p>
          ) : (
            <RowList>
              {[...comps]
                .reverse()
                .slice(0, 10)
                .map((c) => (
                  <ListRow
                    key={c.id}
                    title={
                      c.bodyFatPct !== undefined
                        ? `${c.bodyFatPct.toFixed(1)}% body fat`
                        : `Muscle ${fmt(c.muscleMassKg ?? 0)}`
                    }
                    subtitle={`${METHOD_LABELS[c.method].label} · ${formatDayLabel(c.date)} · ${fmt(c.weightKg)}${c.bodyFatPct !== undefined && c.muscleMassKg !== undefined ? ` · muscle ${fmt(c.muscleMassKg)}` : ""}`}
                    onPress={() => setSheet({ key: Date.now(), entry: c })}
                    pressLabel={`Edit reading from ${formatDayLabel(c.date)}`}
                    actionsLabel={`Reading ${formatDayLabel(c.date)} options`}
                    actions={[
                      {
                        label: "Edit",
                        icon: PencilEdit01Icon,
                        onAction: () => setSheet({ key: Date.now(), entry: c }),
                      },
                      {
                        label: "Delete",
                        icon: Delete02Icon,
                        destructive: true,
                        onAction: async () => {
                          await repositories.bodyComps.remove(c.id)
                          toast("Reading deleted")
                        },
                      },
                    ]}
                  />
                ))}
            </RowList>
          )}
        </SectionCard>

        <ChartCard
          title="Weight trend"
          description="Dots are daily weigh-ins; the line smooths out water and food noise."
          action={rangeControl}
          isEmpty={weightData.length < 2}
          emptyDescription="Log at least two weigh-ins to see a trend."
        >
          <ChartContainer
            config={weightChartConfig}
            className="aspect-auto h-64 w-full"
            role="img"
            aria-label={`Weight trend chart. Latest trend ${latestTrend ? fmt(latestTrend.trendKg) : "unknown"}.`}
          >
            <LineChart data={weightData} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={["dataMin - 1", "dataMax + 1"]}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(v: number) => String(Math.round(v))}
              />
              <ChartTooltip
                content={<ChartTooltipContent labelFormatter={dayLabel} />}
              />
              <Line
                dataKey="kg"
                stroke="var(--color-kg)"
                strokeWidth={0}
                dot={{ r: 2.5, fill: "var(--color-kg)" }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              <Line
                dataKey="trend"
                type="monotone"
                stroke="var(--color-trend)"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        </ChartCard>
      </div>

      <SectionCard title="Recent weigh-ins">
        {weights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No weigh-ins yet.</p>
        ) : (
          <RowList>
            {[...weights]
              .reverse()
              .slice(0, 7)
              .map((w) => (
                <ListRow
                  key={w.id}
                  title={fmt(w.kg)}
                  subtitle={formatDayLabel(w.date)}
                  actionsLabel={`Weigh-in ${formatDayLabel(w.date)} options`}
                  actions={[
                    {
                      label: "Delete",
                      icon: Delete02Icon,
                      destructive: true,
                      onAction: async () => {
                        await repositories.bodyWeights.remove(w.id)
                        toast("Weigh-in deleted")
                      },
                    },
                  ]}
                />
              ))}
          </RowList>
        )}
      </SectionCard>

      {sheet ? (
        <BodyCompSheet
          key={sheet.key}
          date={sheet.entry?.date ?? today}
          entry={sheet.entry}
          onClose={() => setSheet(null)}
        />
      ) : null}
    </div>
  )
}
