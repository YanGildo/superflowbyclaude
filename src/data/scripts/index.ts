// Biblioteca de scripts prontos por segmento (nome do segmento → scripts).
import { AGENCIA_BRASIL } from "./agenciaBrasil";
import { AGENCIA_GRINGA } from "./agenciaGringa";
import { EDICAO } from "./edicao";
import { ENSAIO_IA } from "./ensaioIA";
import type { ScriptSeed } from "./types";

export type { ScriptSeed };

export const SCRIPT_LIBRARY: Record<string, ScriptSeed[]> = {
  "Ensaio fotográfico com IA": ENSAIO_IA,
  "Edição de fotos": EDICAO,
  "Agência — Brasileiros na gringa": AGENCIA_GRINGA,
  "Agência — Brasil": AGENCIA_BRASIL,
};

/** Scripts prontos para um segmento (pelo nome); vazio se não houver. */
export const libraryFor = (segmentName: string) => SCRIPT_LIBRARY[segmentName] ?? [];
