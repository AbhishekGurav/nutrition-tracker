import { createFileRoute } from "@tanstack/react-router"

import { FoodDetailPage } from "~/features/food/food-detail-page"

export const Route = createFileRoute("/food/$foodId")({
  component: FoodDetailRoute,
})

function FoodDetailRoute() {
  const { foodId } = Route.useParams()
  return <FoodDetailPage key={foodId} foodId={foodId} />
}
