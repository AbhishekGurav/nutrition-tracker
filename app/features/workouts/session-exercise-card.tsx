import * as React from "react"
import { Checkbox } from "react-aria-components"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ChampionIcon,
  Delete02Icon,
  FireIcon,
  PlusSignIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"

import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"

import type { Exercise, SessionExercise, SetEntry } from "~/domain/schemas"
import type { PRKind } from "~/domain/strength"
import { formatWeight, type WeightUnit } from "~/domain/units"
import { cn } from "~/lib/utils"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { SectionCard } from "~/components/shared/cards"
import { NumberField } from "~/components/shared/number-field"
import { RowActionsMenu } from "~/components/shared/list-row"
import { WeightField } from "~/components/shared/weight-field"

interface SessionExerciseCardProps {
  index: number
  count: number
  row: SessionExercise
  exercise: Exercise | undefined
  lastSets: SetEntry[] | undefined
  prs: Map<string, PRKind[]>
  unit: WeightUnit
  onSetChange: (setId: string, patch: Partial<SetEntry>) => void
  onSetDone: (setId: string, done: boolean) => void
  onAddSet: () => void
  onRemoveSet: (setId: string) => void
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
}

const PR_LABEL: Record<PRKind, string> = { e1rm: "e1RM PR", weight: "Weight PR" }

/** Set | weight | reps | RPE | done. Fits a 320px-wide card on small phones. */
const GRID = "grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,0.8fr)_3rem_2.75rem] items-center gap-1.5"

export function SessionExerciseCard({
  index,
  count,
  row,
  exercise,
  lastSets,
  prs,
  unit,
  onSetChange,
  onSetDone,
  onAddSet,
  onRemoveSet,
  onMove,
  onRemove,
}: SessionExerciseCardProps) {
  const name = exercise?.name ?? "Deleted exercise"
  const last = lastSets?.filter((s) => !s.isWarmup)
  let workingNo = 0

  return (
    <SectionCard
      headingLevel={2}
      title={name}
      description={
        last && last.length
          ? `Last time: ${last.map((s) => `${formatWeight(s.weightKg, unit)} × ${s.reps}`).slice(0, 4).join(", ")}`
          : "First time logging this lift"
      }
      action={
        <RowActionsMenu
          label={`${name} options`}
          actions={[
            ...(index > 0 ? [{ label: "Move up", icon: ArrowUp01Icon, onAction: () => onMove(-1) }] : []),
            ...(index < count - 1 ? [{ label: "Move down", icon: ArrowDown01Icon, onAction: () => onMove(1) }] : []),
            { label: "Remove exercise", icon: Delete02Icon, destructive: true, onAction: onRemove },
          ]}
        />
      }
      footer={
        <Button variant="ghost" onPress={onAddSet} className="w-full">
          <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
          Add set
        </Button>
      }
    >
      <div role="table" aria-label={`${name} sets`} className="flex flex-col gap-1.5">
        <div role="row" className={cn(GRID, "px-0.5 text-[0.6875rem] font-medium text-muted-foreground")}>
          <span role="columnheader">Set</span>
          <span role="columnheader">{unit}</span>
          <span role="columnheader">Reps</span>
          <span role="columnheader">RPE</span>
          <span role="columnheader" className="text-center">Done</span>
        </div>
        {row.sets.map((set) => {
          if (!set.isWarmup) workingNo++
          const label = set.isWarmup ? "W" : String(workingNo)
          const setPrs = prs.get(set.id)
          const setName = set.isWarmup ? "Warm-up set" : `Set ${workingNo}`
          return (
            <React.Fragment key={set.id}>
              <div
                role="row"
                data-done={set.done || undefined}
                className={cn(GRID, "rounded-md px-0.5 py-0.5 data-done:bg-primary/5")}
              >
                <span role="cell">
                  <DropdownMenuTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${setName} options`}
                      className={cn("font-semibold tabular-nums", set.isWarmup && "text-muted-foreground")}
                    >
                      {label}
                    </Button>
                    <DropdownMenu className="min-w-44">
                      <DropdownMenuGroup>
                        <DropdownMenuItem onAction={() => onSetChange(set.id, { isWarmup: !set.isWarmup })}>
                          <HugeiconsIcon icon={FireIcon} strokeWidth={2} />
                          {set.isWarmup ? "Make working set" : "Make warm-up"}
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onAction={() => onRemoveSet(set.id)}>
                          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                          Delete set
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenu>
                  </DropdownMenuTrigger>
                </span>
                <span role="cell">
                  <WeightField
                    aria-label={`${setName} weight`}
                    unit={unit}
                    hideUnit
                    showSteppers={false}
                    valueKg={set.weightKg}
                    onChangeKg={(kg) => onSetChange(set.id, { weightKg: kg ?? 0 })}
                    max={unit === "lb" ? 2000 : 900}
                  />
                </span>
                <span role="cell">
                  <NumberField
                    aria-label={`${setName} reps`}
                    showSteppers={false}
                    value={set.reps}
                    onChange={(v) => onSetChange(set.id, { reps: v ?? 0 })}
                    decimals={0}
                    max={200}
                  />
                </span>
                <span role="cell">
                  <NumberField
                    aria-label={`${setName} RPE (optional)`}
                    showSteppers={false}
                    value={set.rpe ?? null}
                    onChange={(v) => onSetChange(set.id, { rpe: v === null ? undefined : Math.min(10, Math.max(1, v)) })}
                    min={1}
                    max={10}
                    decimals={1}
                    placeholder="–"
                  />
                </span>
                <span role="cell" className="flex justify-center">
                  <Checkbox
                    isSelected={set.done}
                    onChange={(done) => onSetDone(set.id, done)}
                    aria-label={`${setName} done`}
                    className="group/done flex size-10 cursor-pointer items-center justify-center rounded-md outline-none data-focus-visible:ring-2 data-focus-visible:ring-ring/40"
                  >
                    <span className="flex size-7 items-center justify-center rounded-md border border-input text-primary-foreground transition-colors group-data-selected/done:border-primary group-data-selected/done:bg-primary">
                      <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} className="hidden size-4 group-data-selected/done:block" />
                    </span>
                  </Checkbox>
                </span>
              </div>
              {setPrs ? (
                <div className="flex gap-1 pl-10" aria-live="polite">
                  {setPrs.map((k) => (
                    <Badge key={k}>
                      <HugeiconsIcon icon={ChampionIcon} strokeWidth={2} data-icon="inline-start" />
                      {PR_LABEL[k]}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </React.Fragment>
          )
        })}
      </div>
    </SectionCard>
  )
}
