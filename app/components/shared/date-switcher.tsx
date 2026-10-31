import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"

import { cn } from "~/lib/utils"
import { addDays, formatDayLabel, isDateKey, todayKey, type DateKey } from "~/domain/dates"
import { Button } from "~/components/ui/button"

interface DateSwitcherProps {
  date: DateKey
  onChange: (date: DateKey) => void
  /** Disallow navigating past today. */
  disableFuture?: boolean
  className?: string
}

/** Prev / label / next. Tapping the label opens the native date picker. */
export function DateSwitcher({ date, onChange, disableFuture = true, className }: DateSwitcherProps) {
  const today = todayKey()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const isToday = date === today
  const canGoForward = !disableFuture || date < today

  const openPicker = () => {
    const input = inputRef.current
    if (!input) return
    try {
      input.showPicker()
    } catch {
      input.focus()
    }
  }

  return (
    <div className={cn("flex items-center gap-1", className)} role="group" aria-label="Choose day">
      <Button variant="ghost" size="icon" aria-label="Previous day" onPress={() => onChange(addDays(date, -1))}>
        <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
      </Button>
      <div className="relative">
        <Button variant="ghost" className="min-w-28 font-semibold" onPress={openPicker} aria-label={`Selected day: ${formatDayLabel(date, today)}. Pick a date`}>
          {formatDayLabel(date, today)}
        </Button>
        <input
          ref={inputRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          value={date}
          max={disableFuture ? today : undefined}
          onChange={(e) => {
            if (isDateKey(e.target.value)) onChange(e.target.value)
          }}
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Next day"
        isDisabled={!canGoForward}
        onPress={() => onChange(addDays(date, 1))}
      >
        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
      </Button>
      {!isToday ? (
        <Button variant="outline" size="sm" onPress={() => onChange(today)}>
          Today
        </Button>
      ) : null}
    </div>
  )
}
