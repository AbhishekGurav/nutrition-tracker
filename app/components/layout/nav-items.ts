import {
  Analytics01Icon,
  Dumbbell01Icon,
  Home01Icon,
  Medicine02Icon,
  RiceBowl01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

export type NavPath =
  | "/"
  | "/food"
  | "/workouts"
  | "/supplements"
  | "/progress"
  | "/settings"

export interface NavItem {
  to: NavPath
  label: string
  icon: IconSvgElement
}

/** Primary destinations, shown in the bottom tab bar (mobile) and sidebar (md+). */
export const primaryNav: readonly NavItem[] = [
  { to: "/", label: "Today", icon: Home01Icon },
  { to: "/food", label: "Food", icon: RiceBowl01Icon },
  { to: "/workouts", label: "Workouts", icon: Dumbbell01Icon },
  { to: "/supplements", label: "Supplements", icon: Medicine02Icon },
  { to: "/progress", label: "Progress", icon: Analytics01Icon },
]

export const settingsNav: NavItem = {
  to: "/settings",
  label: "Settings",
  icon: Settings01Icon,
}

/** A nav item is active for its own path and any nested path (except "/"). */
export function isNavActive(itemPath: NavPath, pathname: string) {
  if (itemPath === "/") return pathname === "/"
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`)
}
