import * as React from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { cn } from "~/lib/utils"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"

// ---------- SectionCard ----------

interface SectionCardProps {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  footer?: React.ReactNode
  children?: React.ReactNode
  className?: string
  contentClassName?: string
  /** Heading level for the title (default h2) so pages keep a sane outline. */
  headingLevel?: 2 | 3
}

/** The generic content card: title, optional action, body, optional footer. */
export function SectionCard({
  title,
  description,
  action,
  footer,
  children,
  className,
  contentClassName,
  headingLevel = 2,
}: SectionCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3"
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          <Heading className="text-sm font-medium">{title}</Heading>
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      {children !== undefined ? (
        <CardContent className={contentClassName}>{children}</CardContent>
      ) : null}
      {footer ? <CardFooter className="gap-2">{footer}</CardFooter> : null}
    </Card>
  )
}

// ---------- StatCard ----------

interface StatCardProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: IconSvgElement
  className?: string
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
}: StatCardProps) {
  return (
    <Card size="sm" className={cn("min-w-0", className)}>
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          {icon ? (
            <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
          ) : null}
          {label}
        </CardDescription>
        <CardTitle className="text-lg leading-tight font-semibold break-words tabular-nums sm:text-xl">
          {value}
        </CardTitle>
        {hint ? (
          <p className="text-[0.6875rem] text-muted-foreground">{hint}</p>
        ) : null}
      </CardHeader>
    </Card>
  )
}

// ---------- EmptyState ----------

interface EmptyStateProps {
  icon?: IconSvgElement
  title: string
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Empty className={cn("border py-8", className)}>
      <EmptyHeader>
        {icon ? (
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={icon} strokeWidth={2} />
          </EmptyMedia>
        ) : null}
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}

// ---------- ChartCard ----------

interface ChartCardProps {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

/** Card wrapper for charts with a built-in empty state. */
export function ChartCard({
  title,
  description,
  action,
  isEmpty,
  emptyTitle = "Not enough data yet",
  emptyDescription,
  children,
  footer,
  className,
}: ChartCardProps) {
  return (
    <SectionCard
      title={title}
      description={description}
      action={action}
      footer={footer}
      className={className}
    >
      {isEmpty ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          className="border-dashed"
        />
      ) : (
        children
      )}
    </SectionCard>
  )
}
