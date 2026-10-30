// Ponto de entrada do menu lateral (shadcn/ui). O código foi dividido por responsabilidade
// em ./sidebar/; este arquivo mantém os mesmos nomes exportados de antes.
export { SidebarProvider } from "./sidebar/sidebar-provider";
export { useSidebar } from "./sidebar/use-sidebar";
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
