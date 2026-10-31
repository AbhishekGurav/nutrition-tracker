import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog"

interface ConfirmDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void | Promise<void>
}

/** Confirmation for destructive or irreversible actions. */
export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  destructive = true,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant={destructive ? "destructive" : "default"}
          onPress={() => void onConfirm()}
        >
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialog>
  )
}

/**
 * Small helper for the common "confirm then run" pattern:
 * `const confirm = useConfirm(); confirm.ask({...})` and render `confirm.dialog`.
 */
export function useConfirm() {
  const [state, setState] = React.useState<Omit<ConfirmDialogProps, "isOpen" | "onOpenChange"> | null>(null)
  const ask = React.useCallback(
    (opts: Omit<ConfirmDialogProps, "isOpen" | "onOpenChange">) => setState(opts),
    []
  )
  const dialog = state ? (
    <ConfirmDialog {...state} isOpen onOpenChange={(open) => !open && setState(null)} />
  ) : null
  return { ask, dialog }
}
