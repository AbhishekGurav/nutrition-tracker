import * as React from "react"
import type { Key } from "react-aria-components"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  addDays,
  formatDayLabel,
  formatShortDate,
  todayKey,
} from "~/domain/dates"
import {
  liftHistory,
  personalRecords,
  setsPerMuscle,
  summarizeNutrition,
} from "~/domain/progress"
import { MUSCLE_GROUPS } from "~/domain/schemas"
import { formatWeight, toDisplayWeight } from "~/domain/units"
import { useExercises, useSessions, useUnits } from "~/hooks/use-data"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"
import { Skeleton } from "~/components/ui/skeleton"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { ChartCard, SectionCard, StatCard } from "~/components/shared/cards"
import { ChoiceGroup } from "~/components/shared/choice"
import { ListRow, RowList } from "~/components/shared/list-row"
import { BodyTab } from "~/features/body/body-tab"
import { useNutritionSeries } from "~/features/progress/progress-data"
import { MUSCLE_LABELS } from "~/features/workouts/workout-meta"

export type ProgressTab = "body" | "nutrition" | "strength"
const NUTRITION_RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
] as const

interface ProgressPageProps {
  tab: ProgressTab
  exerciseId?: string
  onChange: (next: { tab?: ProgressTab; exercise?: string }) => void
}

export function ProgressPage({ tab, exerciseId, onChange }: ProgressPageProps) {
  return (
    <>
      <PageHeader title="Progress" />
      <PageBody>
        <Tabs
          selectedKey={tab}
          onSelectionChange={(k) =>
            onChange({
              tab: k === "nutrition" || k === "strength" ? k : "body",
              exercise: exerciseId,
            })
          }
        >
          <TabsList className="w-full sm:w-fit" aria-label="Progress sections">
            <TabsTrigger id="body">Body</TabsTrigger>
            <TabsTrigger id="nutrition">Nutrition</TabsTrigger>
            <TabsTrigger id="strength">Strength</TabsTrigger>
          </TabsList>
          <TabsContent id="body" className="pt-2">
            <BodyTab />
          </TabsContent>
          <TabsContent id="nutrition" className="pt-2">
            <NutritionTab />
          </TabsContent>
          <TabsContent id="strength" className="pt-2">
            <StrengthTab
              exerciseId={exerciseId}
              onExerciseChange={(exercise) =>
                onChange({ tab: "strength", exercise })
              }
            />
          </TabsContent>
        </Tabs>
      </PageBody>
    </>
  )
}

// ---------- Nutrition ----------

const kcalConfig = {
  kcal: { label: "Calories", color: "var(--macro-kcal)" },
  kcalTarget: { label: "Target", color: "var(--muted-foreground)" },
} satisfies ChartConfig
const proteinConfig = {
  protein: { label: "Protein (g)", color: "var(--macro-protein)" },
  proteinTarget: { label: "Target", color: "var(--muted-foreground)" },
} satisfies ChartConfig

function NutritionTab() {
  const [range, setRange] = React.useState<"7" | "30" | "90">("30")
  const series = useNutritionSeries(Number(range))
  if (!series) return <Skeleton className="h-96" />
  const summary = summarizeNutrition(series)
  const data = series.map((p) => ({
    ...p,
    kcal: p.logged ? p.kcal : null,
    protein: p.logged ? p.protein : null,
  }))
  const empty = summary.loggedDays === 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChoiceGroup
          aria-label="Range"
          value={range}
          onChange={setRange}
          options={NUTRITION_RANGES}
          size="sm"
          fill={false}
        />
        <p className="text-xs text-muted-foreground">
          Excludes today. Targets follow each day&apos;s training or rest type.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="Days logged"
          value={`${summary.loggedDays}/${series.length}`}
        />
        <StatCard
          label="Avg calories"
          value={summary.avgKcal.toLocaleString()}
        />
        <StatCard label="Avg protein" value={`${summary.avgProtein} g`} />
        <StatCard
          label="On target"
          value={`${summary.onTargetDays} d`}
          hint="kcal ±10%, protein ≥90%"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Calories vs target"
          isEmpty={empty}
          emptyDescription="Log food to see adherence."
        >
          <ChartContainer
            config={kcalConfig}
            className="aspect-auto h-64 w-full"
            role="img"
            aria-label={`Calories chart. Average ${summary.avgKcal} kcal.`}
          >
            <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis tickLine={false} axisLine={false} width={44} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, p) =>
                      formatDayLabel(String(p?.[0]?.payload?.date ?? ""))
                    }
                  />
                }
              />
              <Bar
                dataKey="kcal"
                fill="var(--color-kcal)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
              <Line
                dataKey="kcalTarget"
                type="stepAfter"
                stroke="var(--color-kcalTarget)"
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ChartContainer>
        </ChartCard>
        <ChartCard
          title="Protein vs target"
          isEmpty={empty}
          emptyDescription="Log food to see adherence."
        >
          <ChartContainer
            config={proteinConfig}
            className="aspect-auto h-64 w-full"
            role="img"
            aria-label={`Protein chart. Average ${summary.avgProtein} grams.`}
          >
            <ComposedChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis tickLine={false} axisLine={false} width={36} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, p) =>
                      formatDayLabel(String(p?.[0]?.payload?.date ?? ""))
                    }
                  />
                }
              />
              <Bar
                dataKey="protein"
                fill="var(--color-protein)"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              />
              <Line
                dataKey="proteinTarget"
                type="stepAfter"
                stroke="var(--color-proteinTarget)"
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ChartContainer>
        </ChartCard>
      </div>
    </div>
  )
}

// ---------- Strength ----------

const liftConfig = {
  e1rm: { label: "Estimated 1RM", color: "var(--macro-protein)" },
  weight: { label: "Heaviest set", color: "var(--muted-foreground)" },
} satisfies ChartConfig
const volumeConfig = {
  sets: { label: "Hard sets", color: "var(--macro-kcal)" },
} satisfies ChartConfig

function StrengthTab({
  exerciseId,
  onExerciseChange,
}: {
  exerciseId?: string
  onExerciseChange: (id: string) => void
}) {
  const sessions = useSessions()
  const exercises = useExercises()
  const { weightUnit } = useUnits()

  const finished = React.useMemo(
    () => (sessions ?? []).filter((s) => s.endedAt !== undefined),
    [sessions]
  )
  const exMap = React.useMemo(
    () => new Map((exercises ?? []).map((e) => [e.id, e])),
    [exercises]
  )
  const prs = React.useMemo(
    () => personalRecords(finished, exMap),
    [finished, exMap]
  )

  if (!sessions || !exercises) return <Skeleton className="h-96" />

  // Default to the lift with the most history.
  const counts = new Map<string, number>()
  for (const s of finished)
    for (const e of s.exercises)
      counts.set(e.exerciseId, (counts.get(e.exerciseId) ?? 0) + 1)
  const options = prs.map((p) => ({
    id: p.exerciseId,
    name: p.name,
    n: counts.get(p.exerciseId) ?? 0,
  }))
  const selected =
    (exerciseId && options.some((o) => o.id === exerciseId)
      ? exerciseId
      : undefined) ?? [...options].sort((a, b) => b.n - a.n)[0]?.id

  const history = selected ? liftHistory(finished, selected) : []
  const data = history.map((p) => ({
    date: p.date,
    e1rm: toDisplayWeight(p.e1rm, weightUnit),
    weight: toDisplayWeight(p.weightKg, weightUnit),
  }))
  const today = todayKey()
  const volume = setsPerMuscle(finished, exMap, addDays(today, -6), today)
  const volumeData = MUSCLE_GROUPS.map((m) => ({
    muscle: MUSCLE_LABELS[m],
    sets: volume[m],
  }))

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <ChartCard
        title="Estimated 1RM"
        description="Best set per workout (Epley formula)."
        isEmpty={data.length < 2}
        emptyDescription="Log the same lift in at least two workouts."
        action={
          options.length > 0 ? (
            <Select
              value={selected ?? null}
              onChange={(k: Key | null) =>
                typeof k === "string" && onExerciseChange(k)
              }
              className="w-44"
              aria-label="Exercise"
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {options.map((o) => (
                    <SelectItem key={o.id} id={o.id} textValue={o.name}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          ) : null
        }
      >
        <ChartContainer
          config={liftConfig}
          className="aspect-auto h-64 w-full"
          role="img"
          aria-label="Estimated one-rep max over time"
        >
          <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              domain={["dataMin - 5", "dataMax + 5"]}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={(v: number) => String(Math.round(v))}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, p) =>
                    formatDayLabel(String(p?.[0]?.payload?.date ?? ""))
                  }
                />
              }
            />
            <Line
              dataKey="weight"
              stroke="var(--color-weight)"
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="e1rm"
              type="monotone"
              stroke="var(--color-e1rm)"
              strokeWidth={2.5}
              dot={{ r: 2.5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </ChartCard>

      <ChartCard
        title="Hard sets per muscle"
        description="Last 7 days. Secondary muscles count as half a set."
        isEmpty={volumeData.every((d) => d.sets === 0)}
        emptyDescription="Finish a workout to see weekly volume."
      >
        <ChartContainer
          config={volumeConfig}
          className="aspect-auto h-80 w-full"
          role="img"
          aria-label="Weekly sets per muscle group"
        >
          <BarChart
            data={volumeData}
            layout="vertical"
            margin={{ left: 8, right: 16 }}
          >
            <CartesianGrid horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="muscle"
              tickLine={false}
              axisLine={false}
              width={84}
            />
            <ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
            <Bar
              dataKey="sets"
              fill="var(--color-sets)"
              radius={[0, 3, 3, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      <SectionCard
        title="Personal records"
        description={
          prs.length ? `${prs.length} lifts` : "Your best sets show up here."
        }
        className="lg:col-span-2"
      >
        {prs.length > 0 ? (
          <RowList>
            {prs.map((p) => (
              <ListRow
                key={p.exerciseId}
                title={p.name}
                subtitle={`Heaviest ${formatWeight(p.weightKg, weightUnit)} on ${formatDayLabel(p.weightDate)}`}
                trailing={
                  <span className="text-right text-xs tabular-nums">
                    <span className="block font-semibold">
                      {formatWeight(p.e1rm, weightUnit, 0)}
                    </span>
                    <span className="text-muted-foreground">e1RM</span>
                  </span>
                }
                onPress={() => onExerciseChange(p.exerciseId)}
                pressLabel={`Show ${p.name} chart`}
              />
            ))}
          </RowList>
        ) : null}
      </SectionCard>
    </div>
  )
}
