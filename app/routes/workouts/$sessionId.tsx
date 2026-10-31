import { createFileRoute } from "@tanstack/react-router"

import { SessionPage } from "~/features/workouts/session-page"

export const Route = createFileRoute("/workouts/$sessionId")({
  component: SessionRoute,
})

function SessionRoute() {
  const { sessionId } = Route.useParams()
  return <SessionPage key={sessionId} sessionId={sessionId} />
}
