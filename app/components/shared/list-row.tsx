import * as React from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { MoreVerticalIcon } from "@hugeicons/core-free-icons"
import { Button as ButtonPrimitive } from "react-aria-components"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"

export interface RowAction {
  label: string
  icon?: IconSvgElement
  onAction: () => void
  destructive?: boolean
}

interface ListRowProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  leading?: React.ReactNode
  /** Right-aligned content such as a value or badge. */
  trailing?: React.ReactNode
  /** Makes the main area pressable. */
  onPress?: () => void
  /** Accessible name for the pressable area when the title isn't plain text. */
  pressLabel?: string
  /** Overflow menu; keeps destructive actions one deliberate step away. */
  actions?: readonly RowAction[]
  actionsLabel?: string
  className?: string
}

/**
 * The standard list row: ≥44px tall, optional pressable body, and an
 * accessible overflow menu instead of swipe gestures.
 */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  pressLabel,
  actions,
  actionsLabel = "More actions",
  className,
}: ListRowProps) {
  const body = (
    <>
      {leading ? <div className="flex shrink-0 items-center">{leading}</div> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="truncate text-sm font-medium">{title}</div>
        {subtitle ? <div className="min-w-0 text-xs text-muted-foreground">{subtitle}</div> : null}
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-2 text-sm">{trailing}</div> : null}
    </>
  )

  return (
    <div data-slot="list-row" className={cn("flex min-h-11 items-center gap-1", className)}>
      {onPress ? (
        <ButtonPrimitive
          onPress={onPress}
          aria-label={pressLabel}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40 data-pressed:bg-muted"
        >
          {body}
        </ButtonPrimitive>
      ) : (
        <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3 px-2 py-2">{body}</div>
      )}
      {actions && actions.length > 0 ? <RowActionsMenu actions={actions} label={actionsLabel} /> : null}
    </div>
  )
}

/** The "⋮" overflow menu used by rows; usable on its own next to custom rows. */
export function RowActionsMenu({ actions, label = "More actions" }: { actions: readonly RowAction[]; label?: string }) {
  return (
    <DropdownMenuTrigger>
      <Button variant="ghost" size="icon" aria-label={label} className="shrink-0">
        <HugeiconsIcon icon={MoreVerticalIcon} strokeWidth={2} />
      </Button>
      <DropdownMenu placement="bottom end" className="min-w-40">
        <DropdownMenuGroup>
          {actions.map((a) => (
            <DropdownMenuItem
              key={a.label}
              onAction={a.onAction}
              variant={a.destructive ? "destructive" : "default"}
              textValue={a.label}
            >
              {a.icon ? <HugeiconsIcon icon={a.icon} strokeWidth={2} /> : null}
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenu>
    </DropdownMenuTrigger>
  )
}

/** Divided vertical list container for ListRows. */
export function RowList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col divide-y [&>[data-slot=list-row]]:py-0.5", className)}
      {...props}
    />
  )
}
