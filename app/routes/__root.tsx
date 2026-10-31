import {
  Outlet,
  createRootRoute,
  redirect,
  useLocation,
  useRouter,
  type ErrorComponentProps,
} from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { ThemeProvider } from "next-themes"

import { Toaster } from "~/components/ui/sonner"
import { Button } from "~/components/ui/button"
import { AppShell } from "~/components/layout/app-shell"
import { PageBody, PageHeader } from "~/components/layout/page-header"
import { PwaUpdater } from "~/components/layout/pwa-updater"
import { ThemeColorSync } from "~/components/layout/theme-toggle"
import { ButtonLink } from "~/components/shared/button-link"
import { hasProfile } from "~/features/settings/profile-service"

export const Route = createRootRoute({
  // First run: send users to onboarding until a profile exists.
  beforeLoad: async ({ location }) => {
    if (location.pathname.startsWith("/onboarding")) return
    if (!(await hasProfile())) throw redirect({ to: "/onboarding" })
  },
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RouteError,
})

function RootComponent() {
  const pathname = useLocation({ select: (l) => l.pathname })
  const bare = pathname.startsWith("/onboarding")

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {bare ? (
        <Outlet />
      ) : (
        <AppShell>
          <Outlet />
        </AppShell>
      )}
      <Toaster position="top-center" />
      <PwaUpdater />
      <ThemeColorSync />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-left" />}
    </ThemeProvider>
  )
}

function NotFound() {
  return (
    <>
      <PageHeader title="Not found" />
      <PageBody>
        <p className="text-sm text-muted-foreground">That page doesn&apos;t exist.</p>
        <ButtonLink to="/" variant="outline" className="w-fit">
          Back to today
        </ButtonLink>
      </PageBody>
    </>
  )
}

/** Shown if a page throws. Data stays safe in IndexedDB; a retry usually fixes it. */
function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <div role="alert" className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        Your data is stored on this device and hasn&apos;t been lost. Try again, or go back to Today.
      </p>
      {import.meta.env.DEV ? (
        <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">{error instanceof Error ? error.message : String(error)}</pre>
      ) : null}
      <div className="flex gap-2">
        <Button
          onPress={() => {
            reset()
            void router.invalidate()
          }}
        >
          Try again
        </Button>
        <Button variant="outline" onPress={() => (window.location.href = "/")}>
          Go to Today
        </Button>
      </div>
    </div>
  )
}
