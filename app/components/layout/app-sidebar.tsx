import { useLocation } from "@tanstack/react-router"
import { HugeiconsIcon } from "@hugeicons/react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"
import { APP_NAME, AppLogo } from "~/components/layout/app-logo"
import {
  isNavActive,
  primaryNav,
  settingsNav,
  type NavItem,
} from "~/components/layout/nav-items"

function NavMenuItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isNavActive(item.to, pathname)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        href={item.to}
        isActive={active}
        aria-current={active ? "page" : undefined}
        tooltip={item.label}
        size="lg"
        className="h-10"
      >
        <HugeiconsIcon icon={item.icon} strokeWidth={2} />
        <span>{item.label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

/** Tablet/desktop navigation. Uses the same nav items as the mobile tab bar. */
export function AppSidebar() {
  const pathname = useLocation({ select: (l) => l.pathname })

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 p-1">
          <AppLogo className="size-7 shrink-0" />
          <span className="truncate text-sm font-semibold group-data-[collapsible=icon]:hidden">
            {APP_NAME}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu aria-label="Primary">
              {primaryNav.map((item) => (
                <NavMenuItem key={item.to} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <NavMenuItem item={settingsNav} pathname={pathname} />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
