import { Outlet, useLocation } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "./AppSidebar";
import { BusinessSwitcher } from "./BusinessSwitcher";
import { ALL_NAV_ITEMS } from "@/lib/nav";
import { useWorkspace } from "@/lib/workspace";
import { useTeamSync } from "@/hooks/useTeamSync";

export function AppLayout() {
  const { pathname } = useLocation();
  const current = ALL_NAV_ITEMS.find((i) => i.path === pathname);
  const { workspace, isTeam } = useWorkspace();
  useTeamSync(workspace?.id, isTeam);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          <p className="hidden truncate font-heading text-sm font-medium sm:block">{current?.label ?? "Superflow"}</p>
          <div className="ml-auto">
            <BusinessSwitcher />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
