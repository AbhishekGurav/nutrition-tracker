import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete02Icon,
  FireIcon,
  Medicine02Icon,
  PauseIcon,
  PencilEdit01Icon,
  PlayIcon,
  PlusSignIcon,
  Target02Icon,
} from "@hugeicons/core-free-icons"

import type { Supplement } from "~/domain/schemas"
import { lastNDays, todayKey, type DateKey } from "~/domain/dates"
import { adherence, currentStreak, indexLogs, scheduledOn } from "~/domain/streaks"
import { repositories } from "~/data/repositories"
import { useSupplementLogs, useSupplements } from "~/hooks/use-data"
import { Button } from "~/components/ui/button"
import { Skeleton } from "~/components/ui/skeleton"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { EmptyState, SectionCard, StatCard } from "~/components/shared/cards"
import { DateSwitcher } from "~/components/shared/date-switcher"
import { ListRow, RowActionsMenu, RowList, type RowAction } from "~/components/shared/list-row"
import { ResponsiveSheet } from "~/components/shared/responsive-sheet"
import { useConfirm } from "~/components/shared/confirm-dialog"
import { SupplementCheckRow } from "~/features/supplements/supplement-check-row"
import { emptySupplement, SupplementForm, type SupplementDraft } from "~/features/supplements/supplement-form"
import { formatDose, groupByTiming, TIMING_LABELS } from "~/features/supplements/supplement-meta"

interface SupplementsPageProps {
  date: DateKey
  onDateChange: (date: DateKey) => void
}

export function SupplementsPage({ date, onDateChange }: SupplementsPageProps) {
  const supplements = useSupplements()
  const logs = useSupplementLogs()
  const confirm = useConfirm()
  const [editing, setEditing] = React.useState<{ key: number; supplement?: Supplement } | null>(null)

  const stats = React.useMemo(() => {
    if (!supplements || !logs) return undefined
    const today = todayKey()
    return {
      streak: currentStreak(supplements, logs, today),
      adherence30: adherence(supplements, logs, lastNDays(today, 30)),
      byDate: indexLogs(logs),
    }
  }, [supplements, logs])

  if (!supplements || !stats) {
    return (
      <>
        <PageHeader title="Supplements" />
        <PageBody>
          <Skeleton className="h-64" />
        </PageBody>
      </>
    )
  }

  const due = scheduledOn(supplements, date)
  const takenIds = stats.byDate.get(date)
  const takenCount = due.filter((s) => takenIds?.has(s.id)).length
  const paused = supplements.filter((s) => !s.active)
  const groups = groupByTiming(due)

  const save = async (draft: SupplementDraft) => {
    if (editing?.supplement) {
      await repositories.supplements.update(editing.supplement.id, draft)
      toast.success(`Updated ${draft.name}`)
    } else {
      await repositories.supplements.create(draft)
      toast.success(`Added ${draft.name}`)
    }
    setEditing(null)
  }

  const actionsFor = (s: Supplement): RowAction[] => [
    { label: "Edit", icon: PencilEdit01Icon, onAction: () => setEditing({ key: Date.now(), supplement: s }) },
    {
      label: s.active ? "Pause" : "Resume",
      icon: s.active ? PauseIcon : PlayIcon,
      onAction: () => void repositories.supplements.update(s.id, { active: !s.active }),
    },
    {
      label: "Delete",
      icon: Delete02Icon,
      destructive: true,
      onAction: () =>
        confirm.ask({
          title: `Delete ${s.name}?`,
          description: "Its history is removed too. Pause it instead to keep past check-ins.",
          onConfirm: async () => {
            await repositories.supplements.remove(s.id)
            toast(`Deleted ${s.name}`)
          },
        }),
    },
  ]

  return (
    <>
      <PageHeader
        title="Supplements"
        actions={
          <Button size="sm" onPress={() => setEditing({ key: Date.now() })}>
            <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
            Add
          </Button>
        }
      />
      <PageBody>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Streak" icon={FireIcon} value={`${stats.streak} d`} hint="Days with everything taken" />
          <StatCard label="30 days" icon={Target02Icon} value={`${stats.adherence30}%`} hint="Doses taken" />
          <StatCard label={date === todayKey() ? "Today" : "This day"} icon={Medicine02Icon} value={`${takenCount}/${due.length}`} hint="Checked off" />
        </div>

        <DateSwitcher date={date} onChange={onDateChange} className="-mx-2 justify-center sm:justify-start" />

        {supplements.length === 0 ? (
          <EmptyState
            icon={Medicine02Icon}
            title="Track what you take"
            description="Add each supplement once with its dose and timing, then tick it off daily."
            action={
              <Button onPress={() => setEditing({ key: Date.now() })}>
                <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} data-icon="inline-start" />
                Add a supplement
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled on this day.</p>
            ) : (
              groups.map((g) => (
                <SectionCard key={g.timing} title={g.label} description={`${g.items.filter((s) => takenIds?.has(s.id)).length} of ${g.items.length}`}>
                  <RowList>
                    {g.items.map((s) => (
                      <div key={s.id} data-slot="list-row" className="flex items-center gap-1">
                        <SupplementCheckRow supplement={s} date={date} taken={!!takenIds?.has(s.id)} />
                        <RowActionsMenu label={`${s.name} options`} actions={actionsFor(s)} />
                      </div>
                    ))}
                  </RowList>
                </SectionCard>
              ))
            )}
            {paused.length > 0 ? (
              <SectionCard title="Paused" description="Not counted toward streaks or adherence.">
                <RowList>
                  {paused.map((s) => (
                    <ListRow
                      key={s.id}
                      title={s.name}
                      subtitle={`${formatDose(s)} · ${TIMING_LABELS[s.timing]}`}
                      actionsLabel={`${s.name} options`}
                      actions={actionsFor(s)}
                    />
                  ))}
                </RowList>
              </SectionCard>
            ) : null}
          </div>
        )}
      </PageBody>

      {editing ? (
        <ResponsiveSheet
          key={editing.key}
          isOpen
          onOpenChange={(open) => !open && setEditing(null)}
          title={editing.supplement ? `Edit ${editing.supplement.name}` : "Add supplement"}
          footer={
            <Button size="lg" type="submit" form="supplement-form">
              {editing.supplement ? "Save" : "Add supplement"}
            </Button>
          }
        >
          <SupplementForm
            id="supplement-form"
            initial={editing.supplement ? stripMeta(editing.supplement) : emptySupplement()}
            onSubmit={(d) => void save(d)}
          />
        </ResponsiveSheet>
      ) : null}
      {confirm.dialog}
    </>
  )
}

function stripMeta({ id: _id, createdAt: _c, updatedAt: _u, ...rest }: Supplement): SupplementDraft {
  return rest
}
