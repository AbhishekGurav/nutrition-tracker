import { cn } from "~/lib/utils"

/**
 * Original Macro Forge mark: an open progress ring (macros) crossed by a
 * barbell (strength). Uses currentColor so it follows the theme.
 */
export function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("size-8 text-primary", className)}
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M16 6.5a9.5 9.5 0 1 1-8.2 4.7"
        fill="none"
        stroke="var(--primary-foreground)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <g fill="var(--primary-foreground)">
        <rect x="9" y="15" width="14" height="2" rx="1" />
        <rect x="10" y="12" width="2.4" height="8" rx="1" />
        <rect x="19.6" y="12" width="2.4" height="8" rx="1" />
      </g>
    </svg>
  )
}

export const APP_NAME = "Macro Forge"
