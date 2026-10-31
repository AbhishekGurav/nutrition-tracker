import * as React from "react"
import { useNavigate } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  ChampionIcon,
  Dumbbell01Icon,
  Layers01Icon,
  PlayIcon,
  PlusSignIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons"

import {
  addDays,
  formatDayLabel,
  formatDuration,
  todayKey,
} from "~/domain/dates"
import {
  prCountsBySession,
  sessionVolume,
  sessionWorkingSetCount,
} from "~/domain/strength"
import { formatWeight } from "~/domain/units"
import {
  useActiveSession,
  useExercises,
  useSessions,
  useTemplates,
  useUnits,
} from "~/hooks/use-data"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { ButtonLink } from "~/components/shared/button-link"
import { EmptyState, SectionCard, StatCard } from "~/components/shared/cards"
import { ListRow, RowList } from "~/components/shared/list-row"
import {
  templateSummary,
  useStartWorkout,
} from "~/features/workouts/templates-page"

const HISTORY_PAGE = 20

export function WorkoutsPage() {
  const navigate = useNavigate()
  const sessions = useSessions()
  const templates = useTemplates()
  const exercises = useExercises()
  const active = useActiveSession()
  const { weightUnit } = useUnits()
  const start = useStartWorkout()
  const [shown, setShown] = React.useState(HISTORY_PAGE)

  const names = React.useMemo(
    () => new Map((exercises ?? []).map((e) => [e.id, e.name])),
    [exercises]
  )
  const finished = React.useMemo(
    () =>
      (sessions ?? [])
        .filter((s) => s.endedAt !== undefined)
        .sort((a, b) => b.startedAt - a.startedAt),
    [sessions]
  )
  const prCounts = React.useMemo(() => prCountsBySession(finished), [finished])
  const weekStart = addDays(todayKey(), -6)
  const thisWeek = finished.filter((s) => s.date >= weekStart)

  return (
    <>
      <PageHeader
        title="Workouts"
        actions={
          <Button size="sm" onPress={() => void start()} isDisabled={!!active}>
            <HugeiconsIcon
              icon={PlusSignIcon}
              strokeWidth={2}
              data-icon="inline-start"
            />
            Empty workout
          </Button>
        }
      />
      <PageBody>
        {active ? (
          <SectionCard
            title="Workout in progress"
            description={`${active.name} · started ${new Date(active.startedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
            action={
              <ButtonLink
                to="/workouts/$sessionId"
                params={{ sessionId: active.id }}
              >
                <HugeiconsIcon
                  icon={PlayIcon}
                  strokeWidth={2}
                  data-icon="inline-start"
                />
                Resume
              </ButtonLink>
            }
          />
        ) : null}

        <div className="grid grid-cols-2 gap-3 min-[380px]:grid-cols-3">
          <StatCard
            label="Last 7 days"
            value={thisWeek.length}
            hint="Workouts"
          />
          <StatCard
            label="Volume"
            value={formatWeight(
              thisWeek.reduce((v, s) => v + sessionVolume(s), 0),
              weightUnit,
              0
            )}
            hint="Last 7 days"
          />
          <StatCard
            className="col-span-2 min-[380px]:col-span-1"
            label="PRs"
            icon={ChampionIcon}
            value={thisWeek.reduce((n, s) => n + (prCounts.get(s.id) ?? 0), 0)}
            hint="Last 7 days"
          />
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col gap-4">
            <SectionCard
              title="Start from a template"
              action={
                <ButtonLink to="/workouts/templates" variant="ghost" size="sm">
                  Manage
                </ButtonLink>
              }
            >
              {templates === undefined ? (
                <Skeleton className="h-24" />
              ) : templates.length === 0 ? (
                <EmptyState
                  icon={Layers01Icon}
                  title="No templates yet"
                  description="Save your routine once and start it with one tap."
                  action={
                    <ButtonLink to="/workouts/templates" variant="outline">
                      Create a template
                    </ButtonLink>
                  }
                  className="py-4"
                />
              ) : (
                <RowList>
                  {[...templates]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((t) => (
                      <ListRow
                        key={t.id}
                        title={t.name}
                        subtitle={templateSummary(t, names)}
                        pressLabel={`Start ${t.name}`}
                        onPress={() => void start(t)}
                        trailing={
                          <HugeiconsIcon
                            icon={PlayIcon}
                            strokeWidth={2}
                            className="size-4 text-primary"
                            aria-hidden="true"
                          />
                        }
                      />
                    ))}
                </RowList>
              )}
            </SectionCard>
            <ButtonLink to="/workouts/exercises" variant="outline" size="lg">
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={2}
                data-icon="inline-start"
              />
              Browse exercises
            </ButtonLink>
          </div>

          <SectionCard
            title="History"
            description={
              finished.length ? `${finished.length} workouts` : undefined
            }
          >
            {sessions === undefined ? (
              <Skeleton className="h-48" />
            ) : finished.length === 0 ? (
              <EmptyState
                icon={Dumbbell01Icon}
                title="No workouts yet"
                description="Finished workouts show up here with volume and PRs."
                className="py-4"
              />
            ) : (
              <div className="flex flex-col gap-2">
                <RowList>
                  {finished.slice(0, shown).map((s) => {
                    const prs = prCounts.get(s.id) ?? 0
                    return (
                      <ListRow
                        key={s.id}
                        title={s.name}
                        pressLabel={`${s.name}, ${formatDayLabel(s.date)}`}
                        subtitle={`${formatDayLabel(s.date)} · ${formatDuration((s.endedAt ?? s.startedAt) - s.startedAt)} · ${sessionWorkingSetCount(s)} sets · ${formatWeight(sessionVolume(s), weightUnit, 0)}`}
                        trailing={
                          prs > 0 ? (
                            <Badge>
                              <HugeiconsIcon
                                icon={ChampionIcon}
                                strokeWidth={2}
                                data-icon="inline-start"
                              />
                              {prs} PR{prs === 1 ? "" : "s"}
                            </Badge>
                          ) : null
                        }
                        onPress={() =>
                          void navigate({
                            to: "/workouts/$sessionId",
                            params: { sessionId: s.id },
                          })
                        }
                      />
                    )
                  })}
                </RowList>
                {finished.length > shown ? (
                  <Button
                    variant="ghost"
                    onPress={() => setShown((n) => n + HISTORY_PAGE)}
                  >
                    Show more
                  </Button>
                ) : null}
              </div>
            )}
          </SectionCard>
        </div>
      </PageBody>
    </>
  )
}
