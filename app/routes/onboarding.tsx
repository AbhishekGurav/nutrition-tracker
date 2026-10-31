import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"

import { OnboardingFlow } from "~/features/onboarding/onboarding-flow"
import { hasProfile } from "~/features/settings/profile-service"

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    if (await hasProfile()) throw redirect({ to: "/" })
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  return <OnboardingFlow onDone={() => void navigate({ to: "/", replace: true })} />
}
