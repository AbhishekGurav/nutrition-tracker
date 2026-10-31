import * as React from "react"
import { render } from "@testing-library/react"
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router"

/**
 * Renders `ui` inside a throwaway memory router so components that use
 * Link/useLocation/useNavigate work in tests. Every path matches.
 */
export async function renderWithRouter(
  ui: React.ReactNode,
  { path = "/" }: { path?: string } = {}
) {
  const rootRoute = createRootRoute({
    component: () => (
      <>
        {ui}
        <Outlet />
      </>
    ),
  })
  const catchAll = createRoute({
    getParentRoute: () => rootRoute,
    path: "$",
    component: () => null,
  })
  const index = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => null,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([index, catchAll]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  const result = render(<RouterProvider router={router} />)
  return { ...result, router }
}
