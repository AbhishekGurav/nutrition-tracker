import { Radio, RadioGroup } from "react-aria-components"
import { useTheme } from "next-themes"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon } from "@hugeicons/core-free-icons"

import { toCss } from "~/lib/color"
import { PALETTES } from "~/lib/palettes"
import { usePalette } from "~/lib/palette-store"
import { FieldLabel } from "~/components/ui/field"

/**
 * Palette cards with a live preview of each palette in the current mode.
 * The previews use the palette's own colours (inline), since they show
 * palettes other than the active one.
 */
export function PalettePicker() {
  const [palette, setPalette] = usePalette()
  const { resolvedTheme } = useTheme()
  const mode = resolvedTheme === "dark" ? "dark" : "light"

  return (
    <RadioGroup
      value={palette}
      onChange={(v) => {
        const p = PALETTES.find((x) => x.id === v)
        if (p) setPalette(p.id)
      }}
      className="flex flex-col gap-2"
    >
      <FieldLabel>Colour palette</FieldLabel>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PALETTES.map((p) => {
          const s = p[mode]
          return (
            <Radio
              key={p.id}
              value={p.id}
              aria-label={`${p.name}: ${p.description}`}
              className="group/palette flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border p-2.5 outline-none transition-colors hover:bg-muted/50 data-focus-visible:ring-2 data-focus-visible:ring-ring/40 data-selected:border-primary data-selected:ring-1 data-selected:ring-primary"
            >
              <span
                aria-hidden="true"
                className="flex h-12 w-16 shrink-0 flex-col justify-between overflow-hidden rounded-lg border p-1.5"
                style={{ background: toCss(s.background), borderColor: toCss(s.border, s.borderAlpha) }}
              >
                <span className="h-2 w-8 rounded-full" style={{ background: toCss(s.primary) }} />
                <span className="flex gap-1">
                  {(["kcal", "protein", "carbs", "fat"] as const).map((m) => (
                    <span key={m} className="size-2 rounded-full" style={{ background: toCss(s.macros[m]) }} />
                  ))}
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.description}</span>
              </span>
              <HugeiconsIcon
                icon={Tick02Icon}
                strokeWidth={2.5}
                aria-hidden="true"
                className="hidden size-4 shrink-0 text-primary group-data-selected/palette:block"
              />
            </Radio>
          )
        })}
      </div>
    </RadioGroup>
  )
}
