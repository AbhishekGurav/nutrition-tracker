import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Dumbbell01Icon, PlusSignIcon } from "@hugeicons/core-free-icons"

import type { FoodLogEntry, MealSlot } from "~/domain/schemas"
import { MEAL_SLOTS } from "~/domain/schemas"
import { remainingMacros, sumMacros } from "~/domain/macros"
import { formatDayLabel, todayKey, type DateKey } from "~/domain/dates"
import { repositories } from "~/data/repositories"
import { useActiveSession, useDayTarget, useFoodLog, useFoods } from "~/hooks/use-data"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { Switch } from "~/components/ui/switch"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { SectionCard } from "~/components/shared/cards"
import { DateSwitcher } from "~/components/shared/date-switcher"
import { MacroSummary } from "~/components/shared/macro-display"
import { ButtonLink } from "~/components/shared/button-link"
import { AddFoodSheet, type AddFoodSheetProps } from "~/features/food/add-food-sheet"
import { entriesBySlot, slotForTime } from "~/features/food/food-logging"
import { MealSlotCard } from "~/features/today/meal-slot-card"
import { TodaySupplementsCard } from "~/features/supplements/today-supplements-card"
import { WeightLogCard } from "~/features/progress/weight-log-card"

type SheetState = Pick<AddFoodSheetProps, "slot" | "entry" | "quick"> & { key: number }

interface TodayPageProps {
  date: DateKey
  onDateChange: (date: DateKey) => void
}

export function TodayPage({ date, onDateChange }: TodayPageProps) {
  const entries = useFoodLog(date)
  const foods = useFoods()
  const day = useDayTarget(date)
  const activeSession = useActiveSession()
  const [sheet, setSheet] = React.useState<SheetState | null>(null)

  const foodsById = React.useMemo(() => new Map((foods ?? []).map((f) => [f.id, f])), [foods])
  const bySlot = React.useMemo(() => entriesBySlot(entries ?? []), [entries])
  const consumed = React.useMemo(() => sumMacros((entries ?? []).map((e) => e.macros)), [entries])
  const target = day?.target ?? null
  const remaining = target ? remainingMacros(target, consumed) : undefined

  const openAdd = (slot: MealSlot, opts?: { quick?: boolean }) =>
    setSheet({ key: Date.now(), slot, quick: opts?.quick })
  const openEdit = (entry: FoodLogEntry) => setSheet({ key: Date.now(), slot: entry.slot, entry })

  const isTraining = day?.info.dayType === "training"
  const setTraining = (on: boolean) => {
    if (!day) return
    const inferred = day.info.hasWorkout ? "training" : "rest"
    const next = on ? "training" : "rest"
    // Store an override only when it differs from what we'd infer.
    void repositories.dayMeta.setDayType(date, next === inferred ? undefined : next)
  }

  return (
    <>
      <PageHeader
        title={formatDayLabel(date)}
        description={date === todayKey() ? new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : undefined}
        actions={
          <Button size="sm" onPress={() => openAdd(date === todayKey() ? slotForTime() : "snacks")} className="hidden sm:inline-flex">
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
            Add food
          </Button>
        }
      />
      <PageBody>
        <DateSwitcher date={date} onChange={onDateChange} className="-mx-2 justify-center sm:justify-start" />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col gap-4">
            <SectionCard
              title="Daily targets"
              description={
                day ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={isTraining ? "default" : "secondary"}>{isTraining ? "Training day" : "Rest day"}</Badge>
                    {day.info.hasWorkout && !day.info.isOverride ? <span>Workout logged</span> : null}
                    {day.info.isOverride ? <span>Set manually</span> : null}
                  </span>
                ) : undefined
              }
              action={
                day ? (
                  <Switch aria-label="Training day" isSelected={isTraining} onChange={setTraining} className="mt-1" />
                ) : null
              }
            >
              {entries === undefined || day === undefined ? (
                <Skeleton className="h-32" />
              ) : target ? (
                <MacroSummary consumed={consumed} target={target} />
              ) : (
                <div className="flex flex-col gap-3">
                  <MacroSummary consumed={consumed} target={null} variant="compact" />
                  <ButtonLink to="/settings" variant="outline" className="w-fit">
                    Set your targets
                  </ButtonLink>
                </div>
              )}
            </SectionCard>

            {activeSession ? (
              <SectionCard
                title="Workout in progress"
                description={activeSession.name}
                action={
                  <ButtonLink to="/workouts/$sessionId" params={{ sessionId: activeSession.id }} size="sm">
                    <HugeiconsIcon icon={Dumbbell01Icon} strokeWidth={2} data-icon="inline-start" />
                    Resume
                  </ButtonLink>
                }
              />
            ) : null}

            <TodaySupplementsCard date={date} />
            <WeightLogCard date={date} compact />
          </div>

          <div className="flex flex-col gap-4">
            {entries === undefined
              ? MEAL_SLOTS.map((s) => <Skeleton key={s} className="h-28" />)
              : MEAL_SLOTS.map((slot) => (
                  <MealSlotCard
                    key={slot}
                    slot={slot}
                    date={date}
                    entries={bySlot[slot]}
                    foodsById={foodsById}
                    onAdd={openAdd}
                    onEdit={openEdit}
                  />
                ))}
          </div>
        </div>
      </PageBody>

      {/* Floating add button for one-handed use on phones. */}
      <Button
        size="icon-lg"
        aria-label="Add food"
        onPress={() => openAdd(date === todayKey() ? slotForTime() : "snacks")}
        className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 size-14 rounded-full shadow-lg sm:hidden"
      >
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2.2} className="size-6" />
      </Button>

      {sheet ? (
        <AddFoodSheet
          key={sheet.key}
          isOpen
          onOpenChange={(open) => !open && setSheet(null)}
          date={date}
          slot={sheet.slot}
          entry={sheet.entry}
          quick={sheet.quick}
          remaining={remaining}
        />
      ) : null}
    </>
  )
}
