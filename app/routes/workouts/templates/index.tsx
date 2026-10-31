import { createFileRoute } from "@tanstack/react-router"

import { TemplatesPage } from "~/features/workouts/templates-page"

export const Route = createFileRoute("/workouts/templates/")({
  component: TemplatesPage,
})
