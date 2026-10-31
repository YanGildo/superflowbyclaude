import { useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, Moon, Settings, Sun } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { readTheme, saveTheme } from "@/lib/theme";

const ICON_BTN = "flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-white";

function IconAction({ label, children, onClick, to }: { label: string; children: React.ReactNode; onClick?: () => void; to?: string }) {
  const el = to
    ? <Link to={to} aria-label={label} className={ICON_BTN}>{children}</Link>
    : <button type="button" aria-label={label} onClick={onClick} className={ICON_BTN}>{children}</button>;
  return <Tooltip><TooltipTrigger asChild>{el}</TooltipTrigger><TooltipContent side="top">{label}</TooltipContent></Tooltip>;
}

/** Rodapé do menu: perfil (abre Configurações) + atalhos de configurações, tema e sair. */
export function SidebarUser() {
  const { user, signOut } = useAuth();
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
  const [dark, setDark] = useState(() => readTheme() !== "claro");
  const toggleTheme = () => { saveTheme(dark ? "claro" : "escuro"); setDark(!dark); };

  return (
    <div className="space-y-1.5">
      <Link to="/configuracoes?aba=perfil" className="flex items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-sidebar-accent">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[11px] font-semibold text-white">{initials}</span>
        <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-xs font-medium text-white">{name}</span>
          <span className="block truncate text-[11px] text-sidebar-foreground/60">{user?.email}</span>
        </span>
      </Link>
      <div className="flex items-center gap-1 px-1 group-data-[collapsible=icon]:flex-col">
        <IconAction label={dark ? "Tema claro" : "Tema escuro"} onClick={toggleTheme}>{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}</IconAction>
        <IconAction label="Configurações" to="/configuracoes">{<Settings className="size-4" />}</IconAction>
        <span className="flex-1" />
        <IconAction label="Sair" onClick={() => void signOut()}><LogOut className="size-4" /></IconAction>
      </div>
    </div>
  );
}
