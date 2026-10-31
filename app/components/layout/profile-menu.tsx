import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Delete02Icon,
  Download01Icon,
  Settings01Icon,
  User03Icon,
} from "@hugeicons/core-free-icons"

import { useProfile } from "~/hooks/use-data"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { useConfirm } from "~/components/shared/confirm-dialog"
import { ProfileAvatar } from "~/features/profile/profile-avatar"
import { EXPERIENCE_LABELS } from "~/features/profile/profile-meta"
import { downloadBackup, eraseAllData } from "~/features/settings/backup"

/** Profile avatar trigger and account-level actions for the single local athlete. */
export function ProfileMenu() {
  const profile = useProfile()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const name = profile?.displayName ?? "Profile"

  return (
    <>
      <DropdownMenuTrigger>
        <Button
          variant="ghost"
          size="icon-lg"
          className="rounded-full"
          aria-label="Open profile menu"
        >
          <ProfileAvatar
            displayName={name}
            avatarDataUrl={profile?.avatarDataUrl}
            size="sm"
          />
        </Button>
        <DropdownMenu placement="bottom end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-2">
              <span className="truncate text-sm font-medium text-foreground">
                {name}
              </span>
              {profile ? (
                <span>
                  {EXPERIENCE_LABELS[profile.trainingExperience].label} lifter
                </span>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuItem
              textValue="Profile"
              onAction={() => void navigate({ to: "/profile" })}
            >
              <HugeiconsIcon icon={User03Icon} strokeWidth={2} />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              textValue="Settings"
              onAction={() => void navigate({ to: "/settings" })}
            >
              <HugeiconsIcon icon={Settings01Icon} strokeWidth={2} />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              textValue="Export all data"
              onAction={() =>
                void downloadBackup().then(() =>
                  toast.success("Backup downloaded.")
                )
              }
            >
              <HugeiconsIcon icon={Download01Icon} strokeWidth={2} />
              Export all data
            </DropdownMenuItem>
            <DropdownMenuItem
              textValue="Erase profile and data"
              variant="destructive"
              onAction={() =>
                confirm.ask({
                  title: "Erase profile and all data?",
                  description:
                    "Your profile, photo, food logs, workouts, supplements, custom foods and measurements will be deleted. This can't be undone.",
                  confirmLabel: "Erase profile & data",
                  onConfirm: async () => {
                    await eraseAllData()
                    void navigate({ to: "/onboarding" })
                  },
                })
              }
            >
              <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              Erase profile & data
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenu>
      </DropdownMenuTrigger>
      {confirm.dialog}
    </>
  )
}
