import type { Equipment, Exercise, MuscleGroup } from "~/domain/schemas"
import { EQUIPMENT, MUSCLE_GROUPS } from "~/domain/schemas"

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
}

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  bodyweight: "Bodyweight",
  kettlebell: "Kettlebell",
  band: "Band",
  other: "Other",
}

export const MUSCLE_OPTIONS = MUSCLE_GROUPS.map((value) => ({ value, label: MUSCLE_LABELS[value] }))
export const EQUIPMENT_OPTIONS = EQUIPMENT.map((value) => ({ value, label: EQUIPMENT_LABELS[value] }))

export interface ExerciseFilter {
  muscle: MuscleGroup | "all"
  equipment: Equipment | "all"
}

/** Muscle filter matches primary or secondary muscles. */
export function filterExercises<T extends Pick<Exercise, "primaryMuscle" | "secondaryMuscles" | "equipment">>(
  exercises: readonly T[],
  { muscle, equipment }: ExerciseFilter
): T[] {
  return exercises.filter(
    (e) =>
      (muscle === "all" || e.primaryMuscle === muscle || e.secondaryMuscles.includes(muscle)) &&
      (equipment === "all" || e.equipment === equipment)
  )
}

export function exerciseSubtitle(e: Pick<Exercise, "primaryMuscle" | "equipment">) {
  return `${MUSCLE_LABELS[e.primaryMuscle]} · ${EQUIPMENT_LABELS[e.equipment]}`
}

export const exerciseSearchText = (e: Exercise) =>
  `${e.name} ${MUSCLE_LABELS[e.primaryMuscle]} ${EQUIPMENT_LABELS[e.equipment]}`
