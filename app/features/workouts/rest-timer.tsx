import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Timer01Icon } from "@hugeicons/core-free-icons"

import { formatTimer } from "~/domain/dates"
import { useNow } from "~/hooks/use-now"
import { Button } from "~/components/ui/button"

export const DEFAULT_REST_SECONDS = 120

/** Rest countdown state. Uses an absolute end time so it survives re-renders and tab sleeps. */
export function useRestTimer() {
  const [endsAt, setEndsAt] = React.useState<number | null>(null)
  const start = React.useCallback((seconds = DEFAULT_REST_SECONDS) => setEndsAt(Date.now() + seconds * 1000), [])
  const add = React.useCallback((seconds: number) => setEndsAt((t) => (t === null ? null : Math.max(Date.now(), t + seconds * 1000))), [])
  const stop = React.useCallback(() => setEndsAt(null), [])
  return { endsAt, start, add, stop }
}

/** Sticky bar above the tab bar while resting. Buzzes (where supported) at zero. */
export function RestTimerBar({ timer }: { timer: ReturnType<typeof useRestTimer> }) {
  const now = useNow(250, timer.endsAt !== null)
  const left = timer.endsAt === null ? 0 : Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
  const done = timer.endsAt !== null && left === 0
  const { stop } = timer

  React.useEffect(() => {
    if (!done) return
    navigator.vibrate?.([200, 100, 200])
    const id = window.setTimeout(stop, 4000)
    return () => window.clearTimeout(id)
  }, [done, stop])

  if (timer.endsAt === null) return null

  return (
    <div
      role="timer"
      aria-live={done ? "assertive" : "off"}
      aria-label="Rest timer"
      className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 px-4 py-2 backdrop-blur md:inset-x-auto md:right-6 md:bottom-6 md:w-96 md:rounded-xl md:border md:shadow-lg"
    >
      <div className="mx-auto flex items-center gap-2">
        <HugeiconsIcon icon={Timer01Icon} strokeWidth={2} className="size-5 text-primary" aria-hidden="true" />
        <span className="flex-1 text-lg font-semibold tabular-nums">{done ? "Rest done" : formatTimer(left)}</span>
        <Button variant="outline" size="sm" onPress={() => timer.add(-15)} aria-label="15 seconds less">
          −15
        </Button>
        <Button variant="outline" size="sm" onPress={() => timer.add(15)} aria-label="15 seconds more">
          +15
        </Button>
        <Button variant="ghost" size="sm" onPress={timer.stop}>
          {done ? "Dismiss" : "Skip"}
        </Button>
      </div>
    </div>
  )
}
