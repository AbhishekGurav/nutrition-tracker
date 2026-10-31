import * as React from "react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ArrowLeft01Icon,
  Delete02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons"

import type { WorkoutSession } from "~/domain/schemas"
import { formatDayLabel, formatDuration, formatTimer } from "~/domain/dates"
import {
  findSessionPRs,
  historyBests,
  lastPerformance,
  sessionVolume,
  sessionWorkingSetCount,
} from "~/domain/strength"
import { formatWeight } from "~/domain/units"
import { repositories } from "~/data/repositories"
import {
  useExercises,
  useSession,
  useSessions,
  useUnits,
} from "~/hooks/use-data"
import { useNow } from "~/hooks/use-now"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { ButtonLink } from "~/components/shared/button-link"
import { EmptyState, StatCard } from "~/components/shared/cards"
import { RowActionsMenu } from "~/components/shared/list-row"
import { TextField } from "~/components/shared/text-field"
import { useConfirm } from "~/components/shared/confirm-dialog"
import { ExercisePickerSheet } from "~/features/workouts/exercise-picker-sheet"
import { RestTimerBar, useRestTimer } from "~/features/workouts/rest-timer"
import { SessionExerciseCard } from "~/features/workouts/session-exercise-card"
import {
  addExercise,
  addSet,
  finishSession,
  moveExercise,
  mutateSession,
  removeExercise,
  removeSet,
  updateSet,
} from "~/features/workouts/session-service"

export function SessionPage({ sessionId }: { sessionId: string }) {
  const session = useSession(sessionId)
  if (session === undefined) {
    return (
      <>
        <PageHeader title="Workout" />
        <PageBody>
          <Skeleton className="h-96" />
        </PageBody>
      </>
    )
  }
  if (session === null) {
    return (
      <>
        <PageHeader title="Workout not found" />
        <PageBody>
          <ButtonLink to="/workouts" variant="outline" className="w-fit">
            Back to workouts
          </ButtonLink>
        </PageBody>
      </>
    )
  }
  return <SessionView session={session} />
}

function SessionView({ session }: { session: WorkoutSession }) {
  const navigate = useNavigate()
  const exercises = useExercises()
  const allSessions = useSessions()
  const { weightUnit } = useUnits()
  const confirm = useConfirm()
  const timer = useRestTimer()
  const [picking, setPicking] = React.useState(false)
  const [notes, setNotes] = React.useState(session.notes ?? "")
  const isLive = session.endedAt === undefined
  const now = useNow(1000, isLive)

  const byId = React.useMemo(
    () => new Map((exercises ?? []).map((e) => [e.id, e])),
    [exercises]
  )
  // Only sessions before this one count as history (matters when editing old workouts).
  const history = React.useMemo(
    () =>
      (allSessions ?? []).filter(
        (s) => s.id !== session.id && s.startedAt < session.startedAt
      ),
    [allSessions, session.id, session.startedAt]
  )
  const prsByRow = React.useMemo(
    () =>
      new Map(
        session.exercises.map((row) => [
          row.id,
          findSessionPRs(row.sets, historyBests(history, row.exerciseId)),
        ])
      ),
    [session.exercises, history]
  )
  const prCount = [...prsByRow.values()].filter((m) => m.size > 0).length
  const doneSets = session.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.done).length,
    0
  )

  const finish = async () => {
    if (doneSets === 0) {
      confirm.ask({
        title: "No sets completed",
        description:
          "Tick off at least one set to save this workout, or discard it.",
        confirmLabel: "Discard workout",
        onConfirm: async () => {
          await repositories.sessions.remove(session.id)
          void navigate({ to: "/workouts" })
        },
      })
      return
    }
    await mutateSession(session.id, () => ({ notes: notes || undefined }))
    await finishSession(session.id)
    toast.success(
      prCount
        ? `Workout saved · ${prCount} PR${prCount === 1 ? "" : "s"}`
        : "Workout saved"
    )
    void navigate({ to: "/workouts" })
  }

  const discard = () =>
    confirm.ask({
      title: isLive ? "Discard this workout?" : "Delete this workout?",
      description: "All sets in it will be deleted.",
      confirmLabel: isLive ? "Discard" : "Delete",
      onConfirm: async () => {
        await repositories.sessions.remove(session.id)
        void navigate({ to: "/workouts" })
      },
    })

  return (
    <>
      <PageHeader
        title={session.name}
        description={
          isLive
            ? `In progress · ${formatTimer((now - session.startedAt) / 1000)}`
            : `${formatDayLabel(session.date)} · ${formatDuration((session.endedAt ?? session.startedAt) - session.startedAt)}`
        }
        leading={
          <ButtonLink
            to="/workouts"
            variant="ghost"
            size="icon"
            aria-label="Back to workouts"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
          </ButtonLink>
        }
        actions={
          <>
            {isLive ? (
              <Button size="sm" onPress={() => void finish()}>
                Finish
              </Button>
            ) : null}
            <RowActionsMenu
              label="Workout options"
              actions={[
                {
                  label: isLive ? "Discard workout" : "Delete workout",
                  icon: Delete02Icon,
                  destructive: true,
                  onAction: discard,
                },
              ]}
            />
          </>
        }
      />
      <PageBody className={timer.endsAt ? "pb-24" : undefined}>
        <div className="grid grid-cols-2 gap-3 min-[380px]:grid-cols-3">
          <StatCard label="Sets done" value={doneSets} />
          <StatCard
            label="Volume"
            value={formatWeight(sessionVolume(session), weightUnit, 0)}
            hint={`${sessionWorkingSetCount(session)} working sets`}
          />
          <StatCard
            className="col-span-2 min-[380px]:col-span-1"
            label="PRs"
            value={prCount}
          />
        </div>

        {session.exercises.length === 0 ? (
          <EmptyState
            title="Empty workout"
            description="Add exercises as you go. Your last weights and reps fill in automatically."
            action={
              <Button onPress={() => setPicking(true)}>
                <HugeiconsIcon
                  icon={PlusSignIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
                Add exercise
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            {session.exercises.map((row, i) => (
              <SessionExerciseCard
                key={row.id}
                index={i}
                count={session.exercises.length}
                row={row}
                exercise={byId.get(row.exerciseId)}
                lastSets={lastPerformance(history, row.exerciseId)}
                prs={prsByRow.get(row.id) ?? new Map()}
                unit={weightUnit}
                onSetChange={(setId, patch) =>
                  void updateSet(session.id, row.id, setId, patch)
                }
                onSetDone={(setId, done) => {
                  void updateSet(session.id, row.id, setId, { done })
                  if (done && isLive) timer.start()
                }}
                onAddSet={() => void addSet(session.id, row.id)}
                onRemoveSet={(setId) =>
                  void removeSet(session.id, row.id, setId)
                }
                onMove={(d) => void moveExercise(session.id, i, d)}
                onRemove={() =>
                  confirm.ask({
                    title: `Remove ${byId.get(row.exerciseId)?.name ?? "exercise"}?`,
                    description: "Its sets in this workout are deleted.",
                    confirmLabel: "Remove",
                    onConfirm: () => void removeExercise(session.id, row.id),
                  })
                }
              />
            ))}
          </div>
        )}

        {session.exercises.length > 0 ? (
          <Button variant="outline" size="lg" onPress={() => setPicking(true)}>
            <HugeiconsIcon
              icon={PlusSignIcon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Add exercise
          </Button>
        ) : null}

        <TextField
          label="Notes"
          multiline
          value={notes}
          onChange={setNotes}
          onBlur={() =>
            void mutateSession(session.id, () => ({
              notes: notes || undefined,
            }))
          }
          placeholder="How did it feel? Anything to change next time?"
        />

        {isLive ? (
          <Button size="lg" onPress={() => void finish()}>
            Finish workout
          </Button>
        ) : null}
      </PageBody>

      <RestTimerBar timer={timer} />
      <ExercisePickerSheet
        isOpen={picking}
        onOpenChange={setPicking}
        selectedIds={new Set(session.exercises.map((e) => e.exerciseId))}
        onPick={(e) => {
          void addExercise(session.id, e.id)
          setPicking(false)
        }}
      />
      {confirm.dialog}
    </>
  )
}
