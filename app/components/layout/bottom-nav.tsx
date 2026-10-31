import { Link, useLocation } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "~/lib/utils"
import { isNavActive, primaryNav } from "~/components/layout/nav-items"

/**
 * Thumb-reach tab bar for phones. Hidden from md up, where the sidebar takes over.
 * Each tab is at least 56px tall and respects the iOS home-indicator safe area.
 */
export function BottomNav() {
  const pathname = useLocation({ select: (l) => l.pathname })

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-background/80 md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {primaryNav.map((item) => {
          const active = isNavActive(item.to, pathname)
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                data-active={active || undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-muted-foreground transition-colors outline-none focus-visible:bg-muted",
                  "data-active:text-primary"
                )}
              >
                <HugeiconsIcon icon={item.icon} strokeWidth={active ? 2.2 : 1.8} className="size-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
