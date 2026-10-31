import { createFileRoute } from "@tanstack/react-router"

import { WorkoutsPage } from "~/features/workouts/workouts-page"

export const Route = createFileRoute("/workouts/")({
  component: WorkoutsPage,
})
