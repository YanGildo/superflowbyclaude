// Campos de formulário por configuração (usado pelos módulos pessoais).
import { parseMoney } from "@/lib/format";

export interface Field {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "ref" | "url";
  required?: boolean;
  half?: boolean;
  placeholder?: string;
  help?: string;
  rows?: number;
  options?: { value: string; label: string }[];
  refs?: { id: string; name: string }[];
  /** Valor inicial quando o registro é novo. */
  initial?: string;
}
export type FormValues = Record<string, string>;

const num = (v: unknown) => (typeof v === "number" ? String(v).replace(".", ",") : "");

export function toForm(fields: Field[], row?: Record<string, unknown> | null): FormValues {
  return Object.fromEntries(fields.map((f) => {
    const v = row?.[f.key];
    if (v === undefined) return [f.key, f.initial ?? ""];
    if (v === null) return [f.key, ""];
    return [f.key, f.type === "number" ? num(v) : String(v)];
  }));
}

/** Números aceitam vírgula ("1.234,50"); vazio vira null. */
export function fromForm(fields: Field[], v: FormValues): Record<string, unknown> {
  return Object.fromEntries(fields.map((f) => {
    const raw = (v[f.key] ?? "").trim();
    if (f.type === "number") return [f.key, raw ? parseMoney(raw) : null];
    return [f.key, raw || null];
  }));
}

export const n1 = (v: number, d = 1) => v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: d });
export const dmy = (iso: string | null | undefined) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
