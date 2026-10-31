import { useLiveQuery } from "dexie-react-hooks"
import { Medicine02Icon } from "@hugeicons/core-free-icons"

import { repositories } from "~/data/repositories"
import { useSupplements } from "~/hooks/use-data"
import type { DateKey } from "~/domain/dates"
import { scheduledOn } from "~/domain/streaks"
import { SectionCard } from "~/components/shared/cards"
import { ButtonLink } from "~/components/shared/button-link"
import { EmptyState } from "~/components/shared/cards"
import { RowList } from "~/components/shared/list-row"
import { SupplementCheckRow } from "~/features/supplements/supplement-check-row"

/** Compact checklist for the Today screen. */
export function TodaySupplementsCard({ date }: { date: DateKey }) {
  const supplements = useSupplements()
  const logs = useLiveQuery(() => repositories.supplementLogs.byDate(date), [date])
  if (!supplements || !logs) return null

  const due = scheduledOn(supplements, date).sort((a, b) => a.name.localeCompare(b.name))
  const takenIds = new Set(logs.map((l) => l.supplementId))
  const taken = due.filter((s) => takenIds.has(s.id)).length

  return (
    <SectionCard
      title="Supplements"
      description={due.length ? `${taken} of ${due.length} taken` : undefined}
      action={
        <ButtonLink to="/supplements" search={date ? { date } : {}} variant="ghost" size="sm">
          {due.length ? "Open" : "Set up"}
        </ButtonLink>
      }
    >
      {due.length === 0 ? (
        <EmptyState icon={Medicine02Icon} title="No supplements yet" description="Add creatine, vitamins or anything else you take daily." className="py-4" />
      ) : (
        <RowList>
          {due.map((s) => (
            <SupplementCheckRow key={s.id} supplement={s} date={date} taken={takenIds.has(s.id)} />
          ))}
        </RowList>
      )}
    </SectionCard>
  )
}
