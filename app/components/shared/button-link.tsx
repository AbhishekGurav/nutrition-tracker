import * as React from "react"
import { createLink } from "@tanstack/react-router"
import type { VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"
import { buttonVariants } from "~/components/ui/button"

type AnchorButtonProps = React.ComponentPropsWithRef<"a"> &
  VariantProps<typeof buttonVariants>

function AnchorButton({ className, variant, size, ...props }: AnchorButtonProps) {
  return (
    <a
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

/**
 * A type-safe TanStack Router link styled as a Button.
 * Use for navigation; use `Button` for actions.
 */
export const ButtonLink = createLink(AnchorButton)
