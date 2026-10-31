import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, Delete02Icon, PencilEdit01Icon, PlusSignIcon } from "@hugeicons/core-free-icons"

import type { Exercise } from "~/domain/schemas"
import { repositories } from "~/data/repositories"
import { useExercises, useSessions, useUnits } from "~/hooks/use-data"
import { bestsFromSets } from "~/domain/strength"
import { formatWeight } from "~/domain/units"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { ButtonLink } from "~/components/shared/button-link"
import { ListRow } from "~/components/shared/list-row"
import { ResponsiveSheet } from "~/components/shared/responsive-sheet"
import { SearchList } from "~/components/shared/search-list"
import { useConfirm } from "~/components/shared/confirm-dialog"
import { ExerciseFilters } from "~/features/workouts/exercise-filters"
import { emptyExercise, ExerciseForm, type ExerciseDraft } from "~/features/workouts/exercise-form"
import {
  EQUIPMENT_LABELS,
  exerciseSearchText,
  exerciseSubtitle,
  filterExercises,
  MUSCLE_LABELS,
  type ExerciseFilter,
} from "~/features/workouts/workout-meta"

export function ExercisesPage() {
  const exercises = useExercises()
  const sessions = useSessions()
  const { weightUnit } = useUnits()
  const confirm = useConfirm()
  const [filter, setFilter] = React.useState<ExerciseFilter>({ muscle: "all", equipment: "all" })
  const [sheet, setSheet] = React.useState<{ key: number; mode: "view" | "edit" | "new"; exercise?: Exercise } | null>(null)

  const sorted = React.useMemo(
    () => filterExercises([...(exercises ?? [])].sort((a, b) => a.name.localeCompare(b.name)), filter),
    [exercises, filter]
  )

  const bests = React.useMemo(() => {
    const map = new Map<string, { e1rm: number; weightKg: number; sessions: number }>()
    for (const s of sessions ?? []) {
      for (const ex of s.exercises) {
        const b = bestsFromSets(ex.sets)
        const cur = map.get(ex.exerciseId) ?? { e1rm: 0, weightKg: 0, sessions: 0 }
        map.set(ex.exerciseId, {
          e1rm: Math.max(cur.e1rm, b.e1rm),
          weightKg: Math.max(cur.weightKg, b.weightKg),
          sessions: cur.sessions + 1,
        })
      }
    }
    return map
  }, [sessions])

  const save = async (draft: ExerciseDraft) => {
    if (sheet?.mode === "edit" && sheet.exercise) {
      await repositories.exercises.update(sheet.exercise.id, draft)
      toast.success(`Saved ${draft.name}`)
    } else {
      await repositories.exercises.create(draft)
      toast.success(`Created ${draft.name}`)
    }
    setSheet(null)
  }

  const viewing = sheet?.mode === "view" ? sheet.exercise : undefined
  const viewingBest = viewing ? bests.get(viewing.id) : undefined

  return (
    <>
      <PageHeader
        title="Exercises"
        leading={
          <ButtonLink to="/workouts" variant="ghost" size="icon" aria-label="Back to workouts">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </ButtonLink>
        }
        actions={
          <Button size="sm" onPress={() => setSheet({ key: Date.now(), mode: "new" })}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
            Custom
          </Button>
        }
      />
      <PageBody className="max-w-3xl">
        {exercises === undefined ? (
          <Skeleton className="h-96" />
        ) : (
          <>
            <ExerciseFilters value={filter} onChange={setFilter} />
            <SearchList
              label="Search exercises"
              placeholder={`Search ${exercises.length} exercises`}
              items={sorted}
              getKey={(e) => e.id}
              getText={exerciseSearchText}
              limit={200}
              renderItem={(e) => {
                const b = bests.get(e.id)
                return (
                  <ListRow
                    title={e.name}
                    subtitle={exerciseSubtitle(e)}
                    trailing={
                      b && b.e1rm > 0 ? (
                        <span className="text-xs text-muted-foreground tabular-nums">e1RM {formatWeight(b.e1rm, weightUnit, 0)}</span>
                      ) : e.source === "user" ? (
                        <Badge variant="outline">Custom</Badge>
                      ) : null
                    }
                    onPress={() => setSheet({ key: Date.now(), mode: "view", exercise: e })}
                    actions={
                      e.source === "user"
                        ? [
                            { label: "Edit", icon: PencilEdit01Icon, onAction: () => setSheet({ key: Date.now(), mode: "edit", exercise: e }) },
                            {
                              label: "Delete",
                              icon: Delete02Icon,
                              destructive: true,
                              onAction: () =>
                                confirm.ask({
                                  title: `Delete ${e.name}?`,
                                  description: "It's removed from templates. Past workouts keep their sets.",
                                  onConfirm: async () => {
                                    await repositories.exercises.remove(e.id)
                                    toast(`Deleted ${e.name}`)
                                  },
                                }),
                            },
                          ]
                        : undefined
                    }
                  />
                )
              }}
            />
          </>
        )}
      </PageBody>

      {sheet ? (
        <ResponsiveSheet
          key={sheet.key}
          isOpen
          onOpenChange={(open) => !open && setSheet(null)}
          title={viewing ? viewing.name : sheet.mode === "edit" ? "Edit exercise" : "New exercise"}
          footer={
            viewing ? undefined : (
              <Button size="lg" type="submit" form="exercise-form">
                Save
              </Button>
            )
          }
        >
          {viewing ? (
            <div className="flex flex-col gap-4 text-sm">
              {viewing.description ? <p>{viewing.description}</p> : null}
              <dl className="grid grid-cols-2 gap-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Main muscle</dt>
                  <dd className="font-medium">{MUSCLE_LABELS[viewing.primaryMuscle]}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Equipment</dt>
                  <dd className="font-medium">{EQUIPMENT_LABELS[viewing.equipment]}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Also works</dt>
                  <dd className="font-medium">
                    {viewing.secondaryMuscles.length ? viewing.secondaryMuscles.map((m) => MUSCLE_LABELS[m]).join(", ") : "—"}
                  </dd>
                </div>
                {viewingBest ? (
                  <>
                    <div>
                      <dt className="text-xs text-muted-foreground">Best e1RM</dt>
                      <dd className="font-medium tabular-nums">{formatWeight(viewingBest.e1rm, weightUnit)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Heaviest set</dt>
                      <dd className="font-medium tabular-nums">{formatWeight(viewingBest.weightKg, weightUnit)}</dd>
                    </div>
                  </>
                ) : null}
              </dl>
              {viewingBest ? (
                <ButtonLink to="/progress" search={{ tab: "strength", exercise: viewing.id }} variant="outline" className="w-fit">
                  View progress chart
                </ButtonLink>
              ) : (
                <p className="text-xs text-muted-foreground">No sets logged yet.</p>
              )}
            </div>
          ) : (
            <ExerciseForm
              id="exercise-form"
              initial={sheet.exercise ? stripMeta(sheet.exercise) : emptyExercise()}
              onSubmit={(d) => void save(d)}
            />
          )}
        </ResponsiveSheet>
      ) : null}
      {confirm.dialog}
    </>
  )
}

function stripMeta({ id: _id, createdAt: _c, updatedAt: _u, ...rest }: Exercise): ExerciseDraft {
  return rest
}
