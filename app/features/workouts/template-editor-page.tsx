import * as React from "react"
import { useBlocker } from "@tanstack/react-router"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowDown01Icon,
  ArrowLeft01Icon,
  ArrowUp01Icon,
  Delete02Icon,
  PlayIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"

import type { TemplateExercise, WorkoutTemplate } from "~/domain/schemas"
import { repositories } from "~/data/repositories"
import { useExercises, useTemplate } from "~/hooks/use-data"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { ButtonLink } from "~/components/shared/button-link"
import { EmptyState, SectionCard } from "~/components/shared/cards"
import { NumberField } from "~/components/shared/number-field"
import { TextField } from "~/components/shared/text-field"
import { ExercisePickerSheet } from "~/features/workouts/exercise-picker-sheet"
import { moveItem } from "~/features/workouts/session-service"
import { useStartWorkout } from "~/features/workouts/templates-page"
import { exerciseSubtitle } from "~/features/workouts/workout-meta"

export function TemplateEditorPage({ templateId }: { templateId: string }) {
  const template = useTemplate(templateId)
  if (template === undefined) {
    return (
      <>
        <PageHeader title="Template" />
        <PageBody>
          <Skeleton className="h-64" />
        </PageBody>
      </>
    )
  }
  if (template === null) {
    return (
      <>
        <PageHeader title="Template not found" />
        <PageBody>
          <ButtonLink to="/workouts/templates" variant="outline" className="w-fit">
            Back to templates
          </ButtonLink>
        </PageBody>
      </>
    )
  }
  return <Editor key={template.id} template={template} />
}

function Editor({ template }: { template: WorkoutTemplate }) {
  const exercises = useExercises()
  const start = useStartWorkout()
  const [name, setName] = React.useState(template.name)
  const [items, setItems] = React.useState<TemplateExercise[]>(template.exercises)
  const [picking, setPicking] = React.useState(false)
  const byId = React.useMemo(() => new Map((exercises ?? []).map((e) => [e.id, e])), [exercises])
  const dirty = name !== template.name || JSON.stringify(items) !== JSON.stringify(template.exercises)
  // Set right before an intentional navigation (e.g. "Save and start").
  const allowNav = React.useRef(false)

  useBlocker({
    shouldBlockFn: () => !allowNav.current && dirty && !window.confirm("Discard unsaved changes to this template?"),
    enableBeforeUnload: () => !allowNav.current && dirty,
  })

  const save = async () => {
    const saved = await repositories.templates.update(template.id, { name: name.trim() || "Untitled", exercises: items })
    toast.success("Template saved")
    return saved
  }

  const patchItem = (index: number, patch: Partial<TemplateExercise>) =>
    setItems((list) =>
      list.map((it, i) => {
        if (i !== index) return it
        const next = { ...it, ...patch }
        // Keep the rep range valid when either end moves past the other.
        if (patch.repMin !== undefined && next.repMax < next.repMin) next.repMax = next.repMin
        if (patch.repMax !== undefined && next.repMin > next.repMax) next.repMin = next.repMax
        return next
      })
    )

  return (
    <>
      <PageHeader
        title={name || "Template"}
        description={dirty ? "Unsaved changes" : `${items.length} exercises`}
        leading={
          <ButtonLink to="/workouts/templates" variant="ghost" size="icon" aria-label="Back to templates">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </ButtonLink>
        }
        actions={
          <Button size="sm" onPress={() => void save()} isDisabled={!dirty}>
            Save
          </Button>
        }
      />
      <PageBody className="max-w-3xl">
        <TextField label="Template name" value={name} onChange={setName} placeholder="e.g. Push A" />

        {items.length === 0 ? (
          <EmptyState title="Add your first exercise" description="Pick from 80+ lifts or create your own." />
        ) : (
          <ol className="flex flex-col gap-3" aria-label="Exercises in this template">
            {items.map((it, i) => {
              const ex = byId.get(it.exerciseId)
              const exName = ex?.name ?? "Deleted exercise"
              return (
                <li key={`${it.exerciseId}-${i}`}>
                  <SectionCard
                    headingLevel={3}
                    title={`${i + 1}. ${exName}`}
                    description={ex ? exerciseSubtitle(ex) : undefined}
                    action={
                      <div className="flex items-center">
                        <Button variant="ghost" size="icon" aria-label={`Move ${exName} up`} isDisabled={i === 0} onPress={() => setItems((l) => moveItem(l, i, -1))}>
                          <HugeiconsIcon icon={ArrowUp01Icon} strokeWidth={2} />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Move ${exName} down`} isDisabled={i === items.length - 1} onPress={() => setItems((l) => moveItem(l, i, 1))}>
                          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Remove ${exName}`} onPress={() => setItems((l) => l.filter((_, j) => j !== i))}>
                          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                        </Button>
                      </div>
                    }
                  >
                    <div className="grid grid-cols-3 gap-2">
                      <NumberField label="Sets" value={it.targetSets} onChange={(v) => v !== null && patchItem(i, { targetSets: v })} min={1} max={20} decimals={0} showSteppers={false} />
                      <NumberField label="Min reps" value={it.repMin} onChange={(v) => v !== null && patchItem(i, { repMin: v })} min={1} max={100} decimals={0} showSteppers={false} />
                      <NumberField label="Max reps" value={it.repMax} onChange={(v) => v !== null && patchItem(i, { repMax: v })} min={1} max={100} decimals={0} showSteppers={false} />
                    </div>
                  </SectionCard>
                </li>
              )
            })}
          </ol>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" size="lg" onPress={() => setPicking(true)}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
            Add exercise
          </Button>
          <Button
            size="lg"
            isDisabled={items.length === 0}
            onPress={async () => {
              const saved = dirty ? await save() : template
              if (!saved) return
              allowNav.current = true
              await start(saved)
            }}
          >
            <HugeiconsIcon icon={PlayIcon} strokeWidth={2} data-icon="inline-start" />
            {dirty ? "Save and start" : "Start workout"}
          </Button>
        </div>
      </PageBody>

      <ExercisePickerSheet
        isOpen={picking}
        onOpenChange={setPicking}
        selectedIds={new Set(items.map((i) => i.exerciseId))}
        onPick={(e) => {
          setItems((l) => [...l, { exerciseId: e.id, targetSets: 3, repMin: 8, repMax: 12 }])
          setPicking(false)
        }}
      />
    </>
  )
}
