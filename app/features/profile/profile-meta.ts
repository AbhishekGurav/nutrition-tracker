import type { TrainingExperience } from "~/domain/schemas"

export const EXPERIENCE_LABELS: Record<
  TrainingExperience,
  { label: string; hint: string }
> = {
  beginner: {
    label: "Beginner",
    hint: "Building consistency and learning the main lifts",
  },
  intermediate: {
    label: "Intermediate",
    hint: "Training consistently with planned progression",
  },
  advanced: {
    label: "Advanced",
    hint: "Several years of structured, specialised training",
  },
}

export const EXPERIENCE_OPTIONS = (
  Object.keys(EXPERIENCE_LABELS) as TrainingExperience[]
).map((value) => ({ value, ...EXPERIENCE_LABELS[value] }))

export function profileInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "MF"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase()
}
