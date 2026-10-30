// Ponto de entrada do menu lateral (shadcn/ui). O código foi dividido por responsabilidade
// em ./sidebar/; este arquivo mantém os mesmos componentes de antes. O hook useSidebar
// fica em ./sidebar/use-sidebar (React Refresh pede componentes e hooks em arquivos separados).
export { SidebarProvider } from "./sidebar/sidebar-provider";
export { Sidebar, SidebarInset, SidebarRail, SidebarTrigger } from "./sidebar/sidebar-shell";
export {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarSeparator,
} from "./sidebar/sidebar-sections";
export {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./sidebar/sidebar-menu";
