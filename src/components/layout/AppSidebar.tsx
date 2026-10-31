import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { BrandMark } from "@/components/brand/BrandMark";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { SidebarNav } from "./SidebarNav";
import { SidebarUser } from "./SidebarUser";

export function AppSidebar() {
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
        <SidebarUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
