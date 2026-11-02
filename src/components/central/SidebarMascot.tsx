import { Link } from "react-router-dom";
import { useCentral } from "@/hooks/useCentral";
import { Mascot } from "./Mascot";

/** Mascote no topo do menu: dorme quando está tudo em dia, acorda com a contagem. Leva para a Central do dia. */
export function SidebarMascot() {
  const c = useCentral();
  const count = c.items.length + c.pending.length;
  return (
    <Link to="/hoje" className="ml-auto shrink-0 rounded-full p-0.5 hover:bg-sidebar-accent group-data-[collapsible=icon]:hidden"
      title={count ? `${c.settings.nome}: ${count} item(ns) esperando por você` : `${c.settings.nome}: tudo em dia`}>
      <Mascot shape={c.settings.forma} count={count} size={34} name={c.settings.nome} />
    </Link>
  );
}
