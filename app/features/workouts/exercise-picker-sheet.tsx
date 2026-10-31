import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, PlusSignIcon } from "@hugeicons/core-free-icons"

import type { Exercise } from "~/domain/schemas"
import { repositories } from "~/data/repositories"
import { useExercises } from "~/hooks/use-data"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { ListRow } from "~/components/shared/list-row"
import { ResponsiveSheet } from "~/components/shared/responsive-sheet"
import { SearchList } from "~/components/shared/search-list"
import { ExerciseFilters } from "~/features/workouts/exercise-filters"
import { emptyExercise, ExerciseForm } from "~/features/workouts/exercise-form"
import {
  exerciseSearchText,
  exerciseSubtitle,
  filterExercises,
  type ExerciseFilter,
} from "~/features/workouts/workout-meta"

interface ExercisePickerSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onPick: (exercise: Exercise) => void
  /** Already-added exercise ids, flagged in the list. */
  selectedIds?: ReadonlySet<string>
}

/** Find an exercise (or create a custom one) and hand it back. */
export function ExercisePickerSheet({ isOpen, onOpenChange, onPick, selectedIds }: ExercisePickerSheetProps) {
  const exercises = useExercises()
  const [filter, setFilter] = React.useState<ExerciseFilter>({ muscle: "all", equipment: "all" })
  const [query, setQuery] = React.useState("")
  const [creating, setCreating] = React.useState(false)

  const sorted = React.useMemo(
    () => filterExercises([...(exercises ?? [])].sort((a, b) => a.name.localeCompare(b.name)), filter),
    [exercises, filter]
  )

  return (
    <ResponsiveSheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={creating ? "New exercise" : "Add exercise"}
      footer={
        creating ? (
          <Button size="lg" type="submit" form="picker-exercise-form">
            Create and add
          </Button>
        ) : undefined
      }
    >
      {creating ? (
        <>
          <Button variant="ghost" className="w-fit" onPress={() => setCreating(false)}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} data-icon="inline-start" />
            Back to library
          </Button>
          <ExerciseForm
            id="picker-exercise-form"
            initial={emptyExercise(query)}
            onSubmit={async (draft) => {
              const created = await repositories.exercises.create(draft)
              toast.success(`Created ${created.name}`)
              onPick(created)
            }}
          />
        </>
      ) : (
        <>
          <ExerciseFilters value={filter} onChange={setFilter} />
          <SearchList
            label="Search exercises"
            placeholder="Search exercises"
            items={sorted}
            getKey={(e) => e.id}
            getText={exerciseSearchText}
            query={query}
            onQueryChange={setQuery}
            limit={100}
            toolbar={
              <Button variant="outline" onPress={() => setCreating(true)} aria-label="Create custom exercise">
                <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
                Custom
              </Button>
            }
            renderItem={(e) => (
              <ListRow
                title={e.name}
                subtitle={exerciseSubtitle(e)}
                trailing={
                  selectedIds?.has(e.id) ? <Badge variant="secondary">Added</Badge> : e.source === "user" ? <Badge variant="outline">Custom</Badge> : null
                }
                onPress={() => onPick(e)}
              />
            )}
            noResults={
              <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
                <p>No exercise matches.</p>
                <Button variant="outline" onPress={() => setCreating(true)}>
                  Create “{query}”
                </Button>
              </div>
            }
          />
        </>
      )}
    </ResponsiveSheet>
  )
}
