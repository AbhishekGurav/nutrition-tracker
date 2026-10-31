import { toCss, type Oklch } from "~/lib/color"
import type { MacroKey } from "~/domain/schemas"

/**
 * Colour palettes. Each has a light and a dark mode; the theme toggle picks
 * the mode and the palette picker in Settings picks the palette.
 *
 * Every palette is checked in tests: text pairs ≥ 4.5:1, macro graphics ≥ 3:1.
 */

export interface ModeSpec {
  background: Oklch
  foreground: Oklch
  card: Oklch
  primary: Oklch
  primaryForeground: Oklch
  muted: Oklch
  mutedForeground: Oklch
  accent: Oklch
  accentForeground: Oklch
  /** Borders: a solid colour in light mode, a translucent tint in dark mode. */
  border: Oklch
  borderAlpha?: number
  ring: Oklch
  destructive: Oklch
  sidebar: Oklch
  macros: Record<MacroKey, Oklch>
}

export interface Palette {
  id: string
  name: string
  description: string
  light: ModeSpec
  dark: ModeSpec
}

const LIGHT_DESTRUCTIVE: Oklch = [0.52, 0.14, 28]
const DARK_DESTRUCTIVE: Oklch = [0.75, 0.12, 30]

export const PALETTE_IDS = ["espresso", "bordeaux", "olive", "terracotta", "midnight"] as const
export type PaletteId = (typeof PALETTE_IDS)[number]

export const PALETTES: readonly (Palette & { id: PaletteId })[] = [
  {
    id: "espresso",
    name: "Espresso & Gold",
    description: "Ivory, roasted brown and brushed gold",
    light: {
      background: [0.968, 0.014, 85],
      foreground: [0.27, 0.03, 55],
      card: [0.987, 0.009, 85],
      primary: [0.5, 0.095, 62],
      primaryForeground: [0.975, 0.012, 85],
      muted: [0.938, 0.018, 80],
      mutedForeground: [0.46, 0.03, 60],
      accent: [0.925, 0.035, 78],
      accentForeground: [0.32, 0.05, 60],
      border: [0.885, 0.02, 78],
      ring: [0.72, 0.1, 78],
      destructive: LIGHT_DESTRUCTIVE,
      sidebar: [0.952, 0.016, 82],
      macros: { kcal: [0.55, 0.1, 68], protein: [0.47, 0.1, 330], carbs: [0.6, 0.1, 118], fat: [0.58, 0.12, 38] },
    },
    dark: {
      background: [0.2, 0.018, 55],
      foreground: [0.93, 0.022, 85],
      card: [0.24, 0.02, 55],
      primary: [0.79, 0.11, 80],
      primaryForeground: [0.22, 0.03, 55],
      muted: [0.285, 0.02, 58],
      mutedForeground: [0.75, 0.03, 80],
      accent: [0.31, 0.03, 65],
      accentForeground: [0.93, 0.022, 85],
      border: [0.9, 0.05, 80],
      borderAlpha: 11,
      ring: [0.62, 0.09, 75],
      destructive: DARK_DESTRUCTIVE,
      sidebar: [0.22, 0.019, 55],
      macros: { kcal: [0.79, 0.11, 80], protein: [0.73, 0.1, 330], carbs: [0.78, 0.1, 118], fat: [0.73, 0.12, 42] },
    },
  },
  {
    id: "bordeaux",
    name: "Bordeaux",
    description: "Blush linen, deep wine and rosé",
    light: {
      background: [0.97, 0.01, 30],
      foreground: [0.27, 0.04, 15],
      card: [0.988, 0.007, 40],
      primary: [0.42, 0.12, 15],
      primaryForeground: [0.975, 0.012, 40],
      muted: [0.94, 0.015, 25],
      mutedForeground: [0.46, 0.035, 15],
      accent: [0.925, 0.03, 15],
      accentForeground: [0.32, 0.07, 15],
      border: [0.89, 0.018, 20],
      ring: [0.62, 0.1, 15],
      destructive: LIGHT_DESTRUCTIVE,
      sidebar: [0.955, 0.013, 25],
      macros: { kcal: [0.45, 0.12, 15], protein: [0.48, 0.08, 295], carbs: [0.62, 0.11, 80], fat: [0.6, 0.11, 48] },
    },
    dark: {
      background: [0.2, 0.025, 10],
      foreground: [0.93, 0.015, 40],
      card: [0.24, 0.028, 10],
      primary: [0.75, 0.1, 15],
      primaryForeground: [0.22, 0.04, 10],
      muted: [0.29, 0.028, 12],
      mutedForeground: [0.76, 0.03, 30],
      accent: [0.32, 0.04, 12],
      accentForeground: [0.93, 0.015, 40],
      border: [0.9, 0.05, 20],
      borderAlpha: 11,
      ring: [0.6, 0.09, 15],
      destructive: DARK_DESTRUCTIVE,
      sidebar: [0.22, 0.026, 10],
      macros: { kcal: [0.75, 0.1, 15], protein: [0.73, 0.09, 295], carbs: [0.8, 0.1, 85], fat: [0.76, 0.1, 55] },
    },
  },
  {
    id: "olive",
    name: "Olive Grove",
    description: "Linen, olive leaf and antique brass",
    light: {
      background: [0.968, 0.014, 95],
      foreground: [0.27, 0.03, 110],
      card: [0.987, 0.009, 95],
      primary: [0.47, 0.08, 122],
      primaryForeground: [0.975, 0.012, 95],
      muted: [0.938, 0.017, 100],
      mutedForeground: [0.46, 0.03, 105],
      accent: [0.925, 0.03, 110],
      accentForeground: [0.32, 0.05, 115],
      border: [0.885, 0.02, 100],
      ring: [0.68, 0.08, 115],
      destructive: LIGHT_DESTRUCTIVE,
      sidebar: [0.952, 0.016, 98],
      macros: { kcal: [0.5, 0.09, 125], protein: [0.48, 0.09, 340], carbs: [0.62, 0.11, 82], fat: [0.58, 0.12, 40] },
    },
    dark: {
      background: [0.2, 0.018, 115],
      foreground: [0.93, 0.02, 95],
      card: [0.24, 0.02, 115],
      primary: [0.77, 0.1, 115],
      primaryForeground: [0.22, 0.03, 115],
      muted: [0.285, 0.02, 115],
      mutedForeground: [0.75, 0.03, 100],
      accent: [0.31, 0.03, 115],
      accentForeground: [0.93, 0.02, 95],
      border: [0.9, 0.05, 100],
      borderAlpha: 11,
      ring: [0.6, 0.08, 115],
      destructive: DARK_DESTRUCTIVE,
      sidebar: [0.22, 0.019, 115],
      macros: { kcal: [0.77, 0.1, 120], protein: [0.73, 0.09, 340], carbs: [0.8, 0.1, 82], fat: [0.73, 0.11, 45] },
    },
  },
  {
    id: "terracotta",
    name: "Terracotta",
    description: "Warm sand, fired clay and ochre",
    light: {
      background: [0.965, 0.016, 65],
      foreground: [0.28, 0.035, 45],
      card: [0.986, 0.01, 70],
      primary: [0.52, 0.13, 42],
      primaryForeground: [0.975, 0.012, 70],
      muted: [0.935, 0.02, 60],
      mutedForeground: [0.46, 0.035, 45],
      accent: [0.925, 0.035, 55],
      accentForeground: [0.33, 0.06, 45],
      border: [0.885, 0.024, 60],
      ring: [0.68, 0.11, 45],
      destructive: [0.5, 0.15, 25],
      sidebar: [0.95, 0.018, 62],
      macros: { kcal: [0.54, 0.13, 42], protein: [0.48, 0.07, 200], carbs: [0.63, 0.12, 82], fat: [0.5, 0.1, 345] },
    },
    dark: {
      background: [0.21, 0.02, 45],
      foreground: [0.93, 0.02, 70],
      card: [0.25, 0.022, 45],
      primary: [0.73, 0.12, 45],
      primaryForeground: [0.22, 0.035, 45],
      muted: [0.295, 0.024, 45],
      mutedForeground: [0.76, 0.03, 60],
      accent: [0.32, 0.035, 45],
      accentForeground: [0.93, 0.02, 70],
      border: [0.9, 0.05, 60],
      borderAlpha: 11,
      ring: [0.6, 0.1, 45],
      destructive: DARK_DESTRUCTIVE,
      sidebar: [0.23, 0.021, 45],
      macros: { kcal: [0.73, 0.12, 45], protein: [0.73, 0.07, 200], carbs: [0.8, 0.11, 82], fat: [0.73, 0.1, 345] },
    },
  },
  {
    id: "midnight",
    name: "Midnight & Champagne",
    description: "Ivory and ink navy by day, champagne on navy by night",
    light: {
      background: [0.97, 0.01, 85],
      foreground: [0.25, 0.04, 260],
      card: [0.988, 0.007, 85],
      primary: [0.36, 0.07, 260],
      primaryForeground: [0.96, 0.025, 85],
      muted: [0.94, 0.014, 85],
      mutedForeground: [0.46, 0.03, 260],
      accent: [0.925, 0.025, 85],
      accentForeground: [0.3, 0.05, 260],
      border: [0.89, 0.016, 85],
      ring: [0.6, 0.07, 260],
      destructive: LIGHT_DESTRUCTIVE,
      sidebar: [0.955, 0.012, 85],
      macros: { kcal: [0.42, 0.09, 260], protein: [0.5, 0.1, 330], carbs: [0.62, 0.11, 80], fat: [0.6, 0.12, 45] },
    },
    dark: {
      background: [0.19, 0.03, 260],
      foreground: [0.93, 0.02, 85],
      card: [0.23, 0.035, 260],
      primary: [0.8, 0.1, 85],
      primaryForeground: [0.22, 0.04, 260],
      muted: [0.28, 0.035, 260],
      mutedForeground: [0.76, 0.025, 85],
      accent: [0.31, 0.04, 260],
      accentForeground: [0.93, 0.02, 85],
      border: [0.9, 0.04, 85],
      borderAlpha: 11,
      ring: [0.62, 0.08, 85],
      destructive: DARK_DESTRUCTIVE,
      sidebar: [0.21, 0.032, 260],
      macros: { kcal: [0.8, 0.1, 85], protein: [0.73, 0.09, 330], carbs: [0.75, 0.08, 240], fat: [0.73, 0.11, 45] },
    },
  },
]

export const DEFAULT_PALETTE: PaletteId = "espresso"

export function getPaletteById(id: string | null | undefined): Palette & { id: PaletteId } {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]
}

/** shadcn CSS variables for one mode; derived tokens keep each palette short. */
export function tokensFor(m: ModeSpec): Record<string, string> {
  const [, pc, ph] = m.primary
  const border = toCss(m.border, m.borderAlpha)
  // Inputs read slightly stronger than borders.
  const input =
    m.borderAlpha === undefined
      ? toCss([m.border[0] - 0.02, m.border[1], m.border[2]])
      : toCss(m.border, m.borderAlpha + 4)
  return {
    background: toCss(m.background),
    foreground: toCss(m.foreground),
    card: toCss(m.card),
    "card-foreground": toCss(m.foreground),
    popover: toCss(m.card),
    "popover-foreground": toCss(m.foreground),
    primary: toCss(m.primary),
    "primary-foreground": toCss(m.primaryForeground),
    secondary: toCss(m.muted),
    "secondary-foreground": toCss(m.foreground),
    muted: toCss(m.muted),
    "muted-foreground": toCss(m.mutedForeground),
    accent: toCss(m.accent),
    "accent-foreground": toCss(m.accentForeground),
    destructive: toCss(m.destructive),
    border,
    input,
    ring: toCss(m.ring),
    // Charts: a lightness ramp of the primary hue.
    ...Object.fromEntries(
      [0.85, 0.75, 0.65, 0.55, 0.45].map((l, i) => [`chart-${i + 1}`, toCss([l, Math.max(pc, 0.06), ph])])
    ),
    sidebar: toCss(m.sidebar),
    "sidebar-foreground": toCss(m.foreground),
    "sidebar-primary": toCss(m.primary),
    "sidebar-primary-foreground": toCss(m.primaryForeground),
    "sidebar-accent": toCss(m.accent),
    "sidebar-accent-foreground": toCss(m.accentForeground),
    "sidebar-border": border,
    "sidebar-ring": toCss(m.ring),
    "macro-kcal": toCss(m.macros.kcal),
    "macro-protein": toCss(m.macros.protein),
    "macro-carbs": toCss(m.macros.carbs),
    "macro-fat": toCss(m.macros.fat),
  }
}

const block = (selector: string, vars: Record<string, string>) =>
  `${selector}{${Object.entries(vars)
    .map(([k, v]) => `--${k}:${v};`)
    .join("")}}`

/**
 * CSS for every palette. The default also applies to a bare :root, so the app
 * looks right before (or without) a data-palette attribute.
 */
export function paletteCss(): string {
  const parts: string[] = []
  const def = getPaletteById(DEFAULT_PALETTE)
  parts.push(block(":root", tokensFor(def.light)), block(":root.dark", tokensFor(def.dark)))
  for (const p of PALETTES) {
    parts.push(block(`:root[data-palette="${p.id}"]`, tokensFor(p.light)))
    parts.push(block(`:root[data-palette="${p.id}"].dark`, tokensFor(p.dark)))
  }
  return parts.join("\n")
}
