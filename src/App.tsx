import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabaseConfigured } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AuthProvider } from "@/lib/AuthProvider";
import { useWorkspace } from "@/lib/workspace";
import { WorkspaceProvider } from "@/lib/WorkspaceProvider";
import { ALL_NAV_ITEMS } from "@/lib/nav";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import RedefinirSenha from "@/pages/RedefinirSenha";
import Setup from "@/pages/Setup";
import Dashboard from "@/pages/Dashboard";
import Configuracoes from "@/pages/Configuracoes";
import EmBreve from "@/pages/EmBreve";
import Tarefas from "@/pages/Tarefas";
import Hoje from "@/pages/Hoje";
import Projetos from "@/pages/Projetos";
import Metas from "@/pages/Metas";
import Equipe from "@/pages/Equipe";
import Lixeira from "@/pages/Lixeira";
import Funis from "@/pages/Funis";
import Comercial from "@/pages/Comercial";
import Scripts from "@/pages/Scripts";
import WhatsApp from "@/pages/WhatsApp";
import Agencia from "@/pages/Agencia";
import Prospeccao from "@/pages/Prospeccao";
import Marketing from "@/pages/Marketing";
import CampanhasDashboard from "@/pages/CampanhasDashboard";
import Entregas from "@/pages/Entregas";
import VisaoGeral from "@/pages/financeiro/VisaoGeral";
import Lancamentos from "@/pages/financeiro/Lancamentos";
import PagarReceber from "@/pages/financeiro/PagarReceber";
import Carteira from "@/pages/financeiro/Carteira";
import Reservas from "@/pages/financeiro/Reservas";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
});

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <WorkspaceProvider><WorkspaceGate>{children}</WorkspaceGate></WorkspaceProvider>;
}

/** Espera o workspace carregar; mostra erro claro se o banco não respondeu. */
function WorkspaceGate({ children }: { children: ReactNode }) {
  const { loading, error, workspace } = useWorkspace();
  if (loading) return <FullScreenLoader />;
  if (error || !workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-sm text-muted-foreground">
        {error
          ? `Não consegui carregar seus dados: ${error}`
          : "Sua conta ainda não tem um workspace. Confira se a migração do banco foi aplicada antes de criar a conta."}
      </div>
    );
  }
  return <>{children}</>;
}

// Telas já construídas; o resto do menu cai em "EmBreve" até a fase dele.
const BUILT: Record<string, ReactNode> = {
  "/": <Dashboard />,
  "/configuracoes": <Configuracoes />,
  "/tarefas": <Tarefas />,
  "/hoje": <Hoje />,
  "/projetos": <Projetos />,
  "/metas": <Metas />,
  "/equipe": <Equipe />,
  "/lixeira": <Lixeira />,
  "/funis": <Funis />,
  "/comercial": <Comercial />,
  "/scripts": <Scripts />,
  "/whatsapp": <WhatsApp />,
  "/agencia": <Agencia />,
  "/prospeccao": <Prospeccao />,
  "/marketing": <Marketing />,
  "/marketing/campanhas-dashboard": <CampanhasDashboard />,
  "/marketing/entregas": <Entregas />,
  "/financeiro": <VisaoGeral />,
  "/financeiro/lancamentos": <Lancamentos />,
  "/financeiro/contas": <PagarReceber />,
  "/financeiro/carteira": <Carteira />,
  "/financeiro/reservas": <Reservas />,
};

export default function App() {
  if (!supabaseConfigured) return <Setup />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />
              <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                {ALL_NAV_ITEMS.map((item) => (
                  <Route key={item.path} path={item.path} element={BUILT[item.path] ?? <EmBreve />} />
                ))}
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
