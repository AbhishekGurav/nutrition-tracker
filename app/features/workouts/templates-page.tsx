import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  Copy01Icon,
  Delete02Icon,
  Layers01Icon,
  PencilEdit01Icon,
  PlayIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"

import type { WorkoutTemplate } from "~/domain/schemas"
import { repositories } from "~/data/repositories"
import { useExercises, useTemplates } from "~/hooks/use-data"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { ButtonLink } from "~/components/shared/button-link"
import { EmptyState, SectionCard } from "~/components/shared/cards"
import { ListRow, RowList } from "~/components/shared/list-row"
import { useConfirm } from "~/components/shared/confirm-dialog"
import { startSession } from "~/features/workouts/session-service"

export function useStartWorkout() {
  const navigate = useNavigate()
  return async (template?: WorkoutTemplate) => {
    const active = await repositories.sessions.active()
    if (active) {
      toast("Finish or discard your current workout first.")
      void navigate({ to: "/workouts/$sessionId", params: { sessionId: active.id } })
      return
    }
    const session = await startSession(template)
    void navigate({ to: "/workouts/$sessionId", params: { sessionId: session.id } })
  }
}

export function templateSummary(t: WorkoutTemplate, names: ReadonlyMap<string, string>) {
  if (t.exercises.length === 0) return "No exercises yet"
  const list = t.exercises.map((e) => names.get(e.exerciseId) ?? "Exercise").slice(0, 3).join(", ")
  return `${t.exercises.length} exercise${t.exercises.length === 1 ? "" : "s"} · ${list}${t.exercises.length > 3 ? "…" : ""}`
}

export function TemplatesPage() {
  const templates = useTemplates()
  const exercises = useExercises()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const start = useStartWorkout()
  const names = new Map((exercises ?? []).map((e) => [e.id, e.name]))

  const create = async () => {
    const t = await repositories.templates.create({ name: "New template", exercises: [] })
    void navigate({ to: "/workouts/templates/$templateId", params: { templateId: t.id } })
  }

  return (
    <>
      <PageHeader
        title="Templates"
        leading={
          <ButtonLink to="/workouts" variant="ghost" size="icon" aria-label="Back to workouts">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </ButtonLink>
        }
        actions={
          <Button size="sm" onPress={() => void create()}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
            New
          </Button>
        }
      />
      <PageBody className="max-w-3xl">
        {templates === undefined ? (
          <Skeleton className="h-48" />
        ) : templates.length === 0 ? (
          <EmptyState
            icon={Layers01Icon}
            title="No templates yet"
            description='Save your routine once (e.g. "Push A") and start it with one tap.'
            action={<Button onPress={() => void create()}>Create a template</Button>}
          />
        ) : (
          <SectionCard title="Your templates">
            <RowList>
              {[...templates]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((t) => (
                  <ListRow
                    key={t.id}
                    title={t.name}
                    subtitle={templateSummary(t, names)}
                    onPress={() => void navigate({ to: "/workouts/templates/$templateId", params: { templateId: t.id } })}
                    pressLabel={`Edit ${t.name}`}
                    trailing={
                      <Button size="sm" variant="outline" onPress={() => void start(t)} isDisabled={t.exercises.length === 0} aria-label={`Start ${t.name}`}>
                        <HugeiconsIcon icon={PlayIcon} strokeWidth={2} data-icon="inline-start" />
                        Start
                      </Button>
                    }
                    actionsLabel={`${t.name} options`}
                    actions={[
                      { label: "Edit", icon: PencilEdit01Icon, onAction: () => void navigate({ to: "/workouts/templates/$templateId", params: { templateId: t.id } }) },
                      {
                        label: "Duplicate",
                        icon: Copy01Icon,
                        onAction: async () => {
                          await repositories.templates.create({ name: `${t.name} (copy)`, exercises: t.exercises })
                          toast.success("Template duplicated")
                        },
                      },
                      {
                        label: "Delete",
                        icon: Delete02Icon,
                        destructive: true,
                        onAction: () =>
                          confirm.ask({
                            title: `Delete ${t.name}?`,
                            description: "Past workouts from this template are kept.",
                            onConfirm: () => repositories.templates.remove(t.id),
                          }),
                      },
                    ]}
                  />
                ))}
            </RowList>
          </SectionCard>
        )}
      </PageBody>
      {confirm.dialog}
    </>
  )
}
