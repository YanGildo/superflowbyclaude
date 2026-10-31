import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import {
  SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSidebar } from "@/components/ui/sidebar/use-sidebar";
import { NAV, type NavItem, type NavSection } from "@/lib/nav";
import { isNavActive, navClosedPref, sectionOf } from "@/lib/navState";
import { cn } from "@/lib/utils";

const ACTIVE_CLASS =
  "relative data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-white data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:left-0 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-full data-[active=true]:before:bg-brand-cyan";

function NavEntry({ item, active }: { item: NavItem; active: boolean }) {
  const soon = item.phase > 0;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.label} size="sm" className={cn("h-8", ACTIVE_CLASS)}>
        <NavLink to={item.path} end>
          <item.icon className={active ? "text-brand-cyan" : soon ? "opacity-60" : undefined} />
          <span className={soon && !active ? "opacity-70" : undefined}>{item.label}</span>
        </NavLink>
      </SidebarMenuButton>
      {soon && <SidebarMenuBadge className="text-[10px] font-normal text-sidebar-foreground/40">F{item.phase}</SidebarMenuBadge>}
    </SidebarMenuItem>
  );
}

function SectionItems({ section, pathname }: { section: NavSection; pathname: string }) {
  return (
    <SidebarMenu className="gap-0.5">
      {section.items.map((item) => <NavEntry key={item.path} item={item} active={isNavActive(item.path, pathname)} />)}
    </SidebarMenu>
  );
}

/** Cabeçalho do grupo: clica para recolher ou abrir só este grupo. */
function SectionHeader({ section, open, hasActive, onToggle }: {
  section: NavSection; open: boolean; hasActive: boolean; onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open}
      className={cn("flex h-7 w-full items-center gap-1.5 rounded-md px-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-sidebar-accent/60",
        hasActive ? "text-sidebar-foreground/90" : "text-sidebar-foreground/50")}>
      <ChevronRight className={cn("size-3 transition-transform", open && "rotate-90")} />
      <span className="flex-1 text-left">{section.label}</span>
      <span className="font-normal tracking-normal text-sidebar-foreground/35">{section.items.length}</span>
    </button>
  );
}

/** Cada grupo abre e fecha de forma independente; todos começam abertos. O grupo da tela atual sempre abre. */
function useClosedSections(pathname: string) {
  const current = sectionOf(pathname)?.id ?? null;
  const [closed, setClosed] = useState<string[]>(navClosedPref.read);

  useEffect(() => {
    if (current) setClosed((c) => (c.includes(current) ? c.filter((x) => x !== current) : c));
  }, [current]);

  const toggle = (id: string) => setClosed((c) => {
    const next = c.includes(id) ? c.filter((x) => x !== id) : [...c, id];
    navClosedPref.save(next);
    return next;
  });
  return { isOpen: (id: string) => !closed.includes(id), toggle, current };
}

export function SidebarNav() {
  const { pathname } = useLocation();
  const { state, isMobile } = useSidebar();
  const { isOpen, toggle, current } = useClosedSections(pathname);

  // Menu recolhido (só ícones): mostra todos os itens, sem cabeçalhos.
  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarGroup className="py-1">
        <SidebarGroupContent>
          {NAV.map((s) => <SectionItems key={s.id} section={s} pathname={pathname} />)}
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      {NAV.map((section) => {
        const open = isOpen(section.id);
        return (
          <SidebarGroup key={section.id} className="px-2 py-0.5">
            <SectionHeader section={section} open={open} hasActive={current === section.id} onToggle={() => toggle(section.id)} />
            {open && <SidebarGroupContent className="pb-1.5 pt-0.5"><SectionItems section={section} pathname={pathname} /></SidebarGroupContent>}
          </SidebarGroup>
        );
      })}
    </>
  );
}
