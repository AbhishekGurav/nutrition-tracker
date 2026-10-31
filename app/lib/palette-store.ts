import * as React from "react"

import { DEFAULT_PALETTE, getPaletteById, paletteCss, type PaletteId } from "~/lib/palettes"

const STORAGE_KEY = "macro-forge-palette"
const listeners = new Set<() => void>()

function read(): PaletteId {
  try {
    return getPaletteById(localStorage.getItem(STORAGE_KEY)).id
  } catch {
    return DEFAULT_PALETTE
  }
}

let current: PaletteId = typeof window === "undefined" ? DEFAULT_PALETTE : read()

function apply(id: PaletteId) {
  document.documentElement.dataset.palette = id
}

export function getPalette() {
  return current
}

export function setPalette(id: PaletteId) {
  current = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Private mode etc.: the choice still applies for this session.
  }
  apply(id)
  listeners.forEach((l) => l())
}

/** Call once before the first render: injects palette CSS and applies the saved choice. */
export function installPalettes() {
  if (!document.getElementById("palette-styles")) {
    const style = document.createElement("style")
    style.id = "palette-styles"
    style.textContent = paletteCss()
    document.head.appendChild(style)
  }
  current = read()
  apply(current)
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePalette() {
  const palette = React.useSyncExternalStore(subscribe, getPalette, () => DEFAULT_PALETTE)
  return [palette, setPalette] as const
}
