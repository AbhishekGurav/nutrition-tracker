import * as React from "react"

import { cn } from "~/lib/utils"
import { SidebarTrigger } from "~/components/ui/sidebar"
import { ProfileMenu } from "~/components/layout/profile-menu"
import { ThemeToggle } from "~/components/layout/theme-toggle"

interface PageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  /** Rendered before the title, e.g. a back link. */
  leading?: React.ReactNode
  /** Right-aligned page actions, before theme and profile controls. */
  actions?: React.ReactNode
  className?: string
}

/** Sticky page header with global theme and profile controls. */
export function PageHeader({
  title,
  description,
  leading,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-backdrop-filter:bg-background/80",
        className
      )}
    >
      <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center gap-1 px-3 sm:gap-2 sm:px-4">
        <SidebarTrigger className="hidden md:inline-flex" />
        {leading}
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-base font-semibold">{title}</h1>
          {description ? (
            <p className="truncate text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        ) : null}
        <ThemeToggle />
        <ProfileMenu />
      </div>
    </header>
  )
}

/** Standard page body container with mobile-first padding. */
export function PageBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 md:py-6",
        className
      )}
      {...props}
    />
  )
}
