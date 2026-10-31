import { Checkbox } from "react-aria-components"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"

import type { Supplement } from "~/domain/schemas"
import type { DateKey } from "~/domain/dates"
import { repositories } from "~/data/repositories"
import { cn } from "~/lib/utils"
import { formatDose } from "~/features/supplements/supplement-meta"

interface SupplementCheckRowProps {
  supplement: Supplement
  date: DateKey
  taken: boolean
  className?: string
}

/** Whole-row tap target to tick a supplement off for the day. */
export function SupplementCheckRow({ supplement, date, taken, className }: SupplementCheckRowProps) {
  return (
    <Checkbox
      isSelected={taken}
      onChange={(next) => void repositories.supplementLogs.setTaken(date, supplement.id, next)}
      className={cn(
        "group/check flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md px-2 py-2 outline-none transition-colors hover:bg-muted/60 data-focus-visible:ring-2 data-focus-visible:ring-ring/40",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-5 shrink-0 items-center justify-center rounded-full border border-input text-primary-foreground transition-colors group-data-selected/check:border-primary group-data-selected/check:bg-primary"
      >
        <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.5} className="hidden size-3.5 group-data-selected/check:block" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-sm font-medium", taken && "text-muted-foreground line-through")}>
          {supplement.name}
        </span>
        <span className="text-xs text-muted-foreground">{formatDose(supplement)}</span>
      </span>
    </Checkbox>
  )
}
