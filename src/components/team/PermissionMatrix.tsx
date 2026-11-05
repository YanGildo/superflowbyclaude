import { LEVELS, MODULES, type Level, type ModuleKey, type Permissions } from "@/lib/access";
import { cn } from "@/lib/utils";

/** Um nível por módulo. Começa tudo em "Sem acesso" (privado por padrão). */
export function PermissionMatrix({ value, onChange, disabled, idPrefix = "perm" }: {
  value: Permissions; onChange: (p: Permissions) => void; disabled?: boolean; idPrefix?: string;
}) {
  const set = (m: ModuleKey, l: Level) => onChange({ ...value, [m]: l });
  return (
    <div className="divide-y rounded-lg border" role="group" aria-label="Permissões por módulo">
      {MODULES.map((m) => {
        const cur = value[m.key] ?? "none";
        return (
          <div key={m.key} className="flex flex-col gap-1.5 p-2 sm:flex-row sm:items-center sm:justify-between">
            <span id={`${idPrefix}-${m.key}`} className="text-sm">{m.label}</span>
            <div className="grid grid-cols-4 gap-1" role="radiogroup" aria-labelledby={`${idPrefix}-${m.key}`}>
              {LEVELS.map((l) => (
                <button key={l.value} type="button" role="radio" aria-checked={cur === l.value} disabled={disabled} title={l.help}
                  aria-label={`${m.label}: ${l.label}`}
                  onClick={() => set(m.key, l.value)}
                  className={cn("rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-50",
                    cur === l.value ? (l.value === "none" ? "border-foreground/30 bg-muted font-medium" : "border-primary bg-primary text-primary-foreground")
                      : "hover:bg-muted")}>
                  {l.value === "none" ? "Nenhum" : l.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
