import { createFileRoute } from "@tanstack/react-router"

import { ExercisesPage } from "~/features/workouts/exercises-page"

export const Route = createFileRoute("/workouts/exercises")({
  component: ExercisesPage,
})
