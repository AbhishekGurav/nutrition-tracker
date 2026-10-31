import { createFileRoute } from "@tanstack/react-router"

import { TemplateEditorPage } from "~/features/workouts/template-editor-page"

export const Route = createFileRoute("/workouts/templates/$templateId")({
  component: TemplateRoute,
})

function TemplateRoute() {
  const { templateId } = Route.useParams()
  return <TemplateEditorPage templateId={templateId} />
}
