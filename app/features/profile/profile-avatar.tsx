import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { cn } from "~/lib/utils"
import { profileInitials } from "~/features/profile/profile-meta"

interface ProfileAvatarProps {
  displayName: string
  avatarDataUrl?: string
  size?: "sm" | "default" | "lg" | "hero"
  className?: string
}

/** Uploaded photo with a deterministic initials fallback. */
export function ProfileAvatar({
  displayName,
  avatarDataUrl,
  size = "default",
  className,
}: ProfileAvatarProps) {
  return (
    <Avatar
      size={size === "hero" ? "default" : size}
      className={cn(
        size === "hero" && "size-16 shrink-0 sm:size-20",
        className
      )}
    >
      {avatarDataUrl ? (
        <AvatarImage src={avatarDataUrl} alt={`${displayName} profile photo`} />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-primary/10 font-semibold text-primary",
          size === "hero" && "text-xl"
        )}
      >
        {profileInitials(displayName)}
      </AvatarFallback>
    </Avatar>
  )
}
