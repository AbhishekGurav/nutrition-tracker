import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createRouter } from "@tanstack/react-router"

import { routeTree } from "./routeTree.gen"
import { db } from "~/data/db"
import { ensureSeeded } from "~/data/seed"
import { installPalettes } from "~/lib/palette-store"
import "./app.css"

// Before anything renders, so the saved palette shows on first paint.
installPalettes()

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

async function start() {
  try {
    // Ask the browser not to evict our IndexedDB data under storage pressure.
    await navigator.storage?.persist?.()
  } catch {
    // Not supported everywhere; data still persists in normal conditions.
  }
  await ensureSeeded(db)

  const rootElement = document.getElementById("root")!
  if (!rootElement.innerHTML) {
    createRoot(rootElement).render(
      <StrictMode>
        <RouterProvider router={router} />
      </StrictMode>
    )
  }
}

void start()
