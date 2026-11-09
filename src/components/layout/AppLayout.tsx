import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "./AppSidebar";
import { BusinessSwitcher } from "./BusinessSwitcher";
import { ALL_NAV_ITEMS } from "@/lib/nav";
import { useWorkspace } from "@/lib/workspace";
import { useTeamSync } from "@/hooks/useTeamSync";
import { FloatingNotes } from "@/components/layout/FloatingNotes";
import { PendingSignupsBanner } from "@/components/team/SignupsCard";
import { cn } from "@/lib/utils";
import { WidthToggle } from "./WidthToggle";

const WIDE_KEY = "superflow:wide";
const readWide = () => { try { return localStorage.getItem(WIDE_KEY) === "1"; } catch { return false; } };

export function AppLayout() {
  const { pathname } = useLocation();
  const current = ALL_NAV_ITEMS.find((i) => i.path === pathname);
  const { workspace, isTeam } = useWorkspace();
  useTeamSync(workspace?.id, isTeam);
  const [wide, setWide] = useState(readWide);
  const toggleWide = () => setWide((w) => { try { localStorage.setItem(WIDE_KEY, w ? "0" : "1"); } catch { /* sem storage */ } return !w; });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-5" />
          <p className="hidden truncate font-heading text-sm font-medium sm:block">{current?.label ?? "Superflow"}</p>
          <div className="ml-auto flex items-center gap-1">
            <WidthToggle wide={wide} onToggle={toggleWide} />
            <BusinessSwitcher />
          </div>
        </header>
        <PendingSignupsBanner />
        <main className={cn("mx-auto w-full flex-1 p-4 pb-20 md:p-6 md:pb-20", wide ? "max-w-none" : "max-w-7xl")}>
          <Outlet />
        </main>
      </SidebarInset>
      <FloatingNotes />
    </SidebarProvider>
  );
}
