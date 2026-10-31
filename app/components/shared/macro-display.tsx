import type { MacroKey, Macros } from "~/domain/schemas"
import { progressRatio } from "~/domain/macros"
import { cn } from "~/lib/utils"
import { GRAM_MACROS, MACRO_META } from "~/components/shared/macro-meta"

const fmt = (n: number) => Math.round(n).toLocaleString()

// ---------- MacroBar ----------

interface MacroBarProps {
  macro: MacroKey
  consumed: number
  target: number
  className?: string
}

/** One macro as consumed vs target, with an explicit over-target state. */
export function MacroBar({ macro, consumed, target, className }: MacroBarProps) {
  const meta = MACRO_META[macro]
  const ratio = progressRatio(consumed, target)
  const over = target > 0 && consumed > target
  const left = target - consumed
  const unit = meta.unit === "g" ? "g" : " kcal"

  return (
    <div
      className={cn("flex min-w-0 flex-col gap-1.5", className)}
      data-slot="macro-bar"
      data-over={over || undefined}
    >
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium">{meta.label}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{fmt(consumed)}</span>
          {target > 0 ? ` / ${fmt(target)}` : ""}
          {unit}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={meta.label}
        aria-valuemin={0}
        aria-valuemax={Math.round(target) || 100}
        aria-valuenow={Math.round(consumed)}
        aria-valuetext={`${meta.label} ${fmt(consumed)} of ${fmt(target)} ${meta.spokenUnit}${over ? ", over target" : ""}`}
        className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            over ? "bg-destructive" : meta.bg
          )}
          style={{ width: `${Math.min(1, ratio) * 100}%` }}
        />
      </div>
      {target > 0 ? (
        <span
          className={cn(
            "text-[0.6875rem] tabular-nums",
            over ? "font-medium text-destructive" : "text-muted-foreground"
          )}
        >
          {over ? `${fmt(-left)}${unit} over` : `${fmt(left)}${unit} left`}
        </span>
      ) : null}
    </div>
  )
}

// ---------- MacroRing ----------

interface MacroRingProps {
  consumed: number
  target: number
  size?: number
  strokeWidth?: number
  className?: string
}

/** Calorie ring with remaining (or over) calories in the centre. */
export function MacroRing({
  consumed,
  target,
  size = 132,
  strokeWidth = 12,
  className,
}: MacroRingProps) {
  const r = (size - strokeWidth) / 2
  const c = 2 * Math.PI * r
  const ratio = Math.min(1, progressRatio(consumed, target))
  const over = target > 0 && consumed > target
  const left = Math.abs(target - consumed)

  return (
    <div
      role="img"
      aria-label={`Calories ${fmt(consumed)} of ${fmt(target)}${over ? `, ${fmt(left)} over` : `, ${fmt(left)} left`}`}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      data-over={over || undefined}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className={cn("transition-[stroke-dashoffset] duration-700", over ? "stroke-destructive" : MACRO_META.kcal.stroke)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
        <span className={cn("text-2xl font-semibold tabular-nums", over && "text-destructive")}>
          {fmt(target > 0 ? left : consumed)}
        </span>
        <span className="text-[0.6875rem] text-muted-foreground">
          {target > 0 ? (over ? "kcal over" : "kcal left") : "kcal"}
        </span>
      </div>
    </div>
  )
}

// ---------- MacroSummary ----------

interface MacroSummaryProps {
  consumed: Macros
  target: Macros | null | undefined
  variant?: "full" | "compact"
  className?: string
}

/** Ring + three bars. "compact" stacks bars only, for cards and sheets. */
export function MacroSummary({ consumed, target, variant = "full", className }: MacroSummaryProps) {
  const t = target ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  if (variant === "compact") {
    return (
      <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
        <MacroBar macro="kcal" consumed={consumed.kcal} target={t.kcal} />
        {GRAM_MACROS.map((m) => (
          <MacroBar key={m} macro={m} consumed={consumed[m]} target={t[m]} />
        ))}
      </div>
    )
  }
  return (
    <div className={cn("flex items-center gap-4 sm:gap-6", className)}>
      <MacroRing consumed={consumed.kcal} target={t.kcal} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {GRAM_MACROS.map((m) => (
          <MacroBar key={m} macro={m} consumed={consumed[m]} target={t[m]} />
        ))}
      </div>
    </div>
  )
}

// ---------- MacroChips ----------

interface MacroChipsProps {
  macros: Macros
  showKcal?: boolean
  className?: string
}

/** Compact inline P/C/F/kcal readout for list rows. */
export function MacroChips({ macros, showKcal = true, className }: MacroChipsProps) {
  const label = `${fmt(macros.kcal)} calories, protein ${fmt(macros.protein)} grams, carbs ${fmt(macros.carbs)} grams, fat ${fmt(macros.fat)} grams`
  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.6875rem] tabular-nums text-muted-foreground", className)}
    >
      <span className="sr-only">{label}</span>
      {showKcal ? (
        <span className="font-medium text-foreground" aria-hidden="true">
          {fmt(macros.kcal)} kcal
        </span>
      ) : null}
      {GRAM_MACROS.map((m) => (
        <span key={m} className="inline-flex items-center gap-1" aria-hidden="true">
          <span className={cn("size-1.5 rounded-full", MACRO_META[m].bg)} />
          {MACRO_META[m].short} {fmt(macros[m])}
        </span>
      ))}
    </span>
  )
}
