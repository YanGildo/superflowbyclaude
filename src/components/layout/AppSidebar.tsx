import { NavLink, useLocation } from "react-router-dom";
import { LogOut } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton,
  SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/brand/BrandMark";
import { NAV } from "@/lib/nav";
import { useAuth } from "@/lib/auth";

export function AppSidebar() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

  const isActive = (path: string) => (path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/"));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <BrandMark className="shrink-0" />
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate font-heading text-sm font-semibold leading-tight text-white">Superflow</p>
            <p className="truncate text-[11px] text-sidebar-foreground/70">Operação completa</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {NAV.map((section) => (
          <SidebarGroup key={section.id} className="py-1.5">
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/50">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const active = isActive(item.path);
                  const soon = item.phase > 0;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                        className="relative data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-white data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:left-0 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-full data-[active=true]:before:bg-brand-cyan"
                      >
                        <NavLink to={item.path} end={item.path === "/"}>
                          <item.icon className={active ? "text-brand-cyan" : soon ? "opacity-60" : undefined} />
                          <span className={soon && !active ? "opacity-70" : undefined}>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                      {soon && (
                        <SidebarMenuBadge className="text-[10px] font-normal text-sidebar-foreground/40">F{item.phase}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sair" onClick={() => void signOut()} className="h-auto py-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[11px] font-semibold text-white">
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-white">{name}</span>
                <span className="block text-[11px] text-sidebar-foreground/60">Sair</span>
              </span>
              <LogOut className="size-4 opacity-60" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
