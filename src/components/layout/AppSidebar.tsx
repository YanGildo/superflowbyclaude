import { NavLink, useLocation } from "react-router-dom";
import { Sparkles, LogOut } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton,
  SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";
import { NAV } from "@/lib/nav";
import { useAuth } from "@/lib/auth";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";

  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/"));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold leading-tight">Superflow</p>
            <p className="truncate text-xs text-muted-foreground">Operação completa</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV.map((section) => (
          <SidebarGroup key={section.id}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive(item.path)} tooltip={item.label}>
                      <NavLink to={item.path} end={item.path === "/"}>
                        <item.icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {item.phase > 0 && (
                      <SidebarMenuBadge className="text-[10px] font-normal text-muted-foreground">F{item.phase}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sair" onClick={() => void signOut()}>
              <LogOut />
              <span className="truncate">Sair · {name}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
