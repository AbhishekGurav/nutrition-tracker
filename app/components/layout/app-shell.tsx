import * as React from "react"
import { useRouter } from "@tanstack/react-router"
import { RouterProvider as AriaRouterProvider } from "react-aria-components"

import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar"
import { AppSidebar } from "~/components/layout/app-sidebar"
import { BottomNav } from "~/components/layout/bottom-nav"

/**
 * Responsive app frame: sidebar from md up, bottom tab bar below md.
 * Also bridges react-aria links (used by some shadcn primitives) to TanStack Router
 * so they navigate client-side.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <AriaRouterProvider
      navigate={(href) => router.history.push(href)}
      useHref={(href) => href}
    >
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </SidebarInset>
        <BottomNav />
      </SidebarProvider>
    </AriaRouterProvider>
  )
}
