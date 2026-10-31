import * as React from "react"
import { toast } from "sonner"
import { useRegisterSW } from "virtual:pwa-register/react"

/**
 * Registers the service worker and asks before switching to a new version,
 * so a reload never interrupts a workout or a half-filled form.
 */
export function PwaUpdater() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  React.useEffect(() => {
    if (!offlineReady) return
    toast.success("Ready to work offline")
    setOfflineReady(false)
  }, [offlineReady, setOfflineReady])

  React.useEffect(() => {
    if (!needRefresh) return
    toast("A new version is available", {
      duration: Infinity,
      action: { label: "Update", onClick: () => void updateServiceWorker(true) },
      cancel: { label: "Later", onClick: () => setNeedRefresh(false) },
    })
  }, [needRefresh, setNeedRefresh, updateServiceWorker])

  return null
}
