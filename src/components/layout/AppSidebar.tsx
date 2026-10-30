import { LogOut } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";
import { BrandMark } from "@/components/brand/BrandMark";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { SidebarNav } from "./SidebarNav";
import { useAuth } from "@/lib/auth";

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

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
        <WorkspaceSwitcher />
      </SidebarHeader>

      <SidebarContent className="gap-0 py-2">
        <SidebarNav />
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
