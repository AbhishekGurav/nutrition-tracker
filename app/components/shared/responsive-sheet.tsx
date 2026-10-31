import * as React from "react"

import { cn } from "~/lib/utils"
import { useIsMobile } from "~/hooks/use-mobile"
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet"

interface ResponsiveSheetProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  /** Sticky action area (e.g. Save / Cancel). */
  footer?: React.ReactNode
  /** Hide the title visually but keep it for screen readers. */
  hideTitle?: boolean
  className?: string
}

/**
 * The one container for create/edit flows: a bottom sheet on phones
 * (thumb-reachable, swipe-free dismiss via overlay/close) and a side panel
 * from md up.
 */
export function ResponsiveSheet({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  footer,
  hideTitle,
  className,
}: ResponsiveSheetProps) {
  const isMobile = useIsMobile()
  const side = isMobile ? "bottom" : "right"

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      side={side}
      className={cn(
        "gap-0",
        side === "bottom"
          ? "max-h-[92svh] rounded-t-2xl"
          : "w-full sm:max-w-md md:max-w-lg",
        className
      )}
    >
      <SheetHeader
        className={cn(
          "shrink-0 px-4 pr-14 pb-3 min-[360px]:px-6 min-[360px]:pr-14",
          hideTitle && "sr-only"
        )}
      >
        {side === "bottom" ? (
          <div
            aria-hidden="true"
            className="mx-auto -mt-3 mb-2 h-1 w-10 rounded-full bg-muted"
          />
        ) : null}
        <SheetTitle className="text-base">{title}</SheetTitle>
        {description ? (
          <SheetDescription>{description}</SheetDescription>
        ) : null}
      </SheetHeader>
      <div
        data-slot="responsive-sheet-body"
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-6 text-sm min-[360px]:px-6"
      >
        {children}
      </div>
      {footer ? (
        <SheetFooter className="shrink-0 border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] min-[360px]:px-6">
          {footer}
        </SheetFooter>
      ) : null}
    </Sheet>
  )
}
