import * as React from "react"
import { useTheme } from "next-themes"
import { HugeiconsIcon } from "@hugeicons/react"
import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"

import { toHex } from "~/lib/color"
import { getPaletteById } from "~/lib/palettes"
import { usePalette } from "~/lib/palette-store"
import { Button } from "~/components/ui/button"

/** Keeps the browser/OS status bar colour in step with the palette and mode. */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme()
  const [palette] = usePalette()
  React.useEffect(() => {
    const spec = getPaletteById(palette)[resolvedTheme === "dark" ? "dark" : "light"]
    const color = toHex(spec.background)
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.setAttribute("content", color)
      m.removeAttribute("media")
    })
  }, [resolvedTheme, palette])
  return null
}

/**
 * One-tap light/dark switch. Picking one here overrides "System";
 * Settings → Appearance can switch back to following the device.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onPress={() => setTheme(isDark ? "light" : "dark")}
      className={className}
    >
      <HugeiconsIcon icon={isDark ? Sun03Icon : Moon02Icon} strokeWidth={2} />
    </Button>
  )
}
