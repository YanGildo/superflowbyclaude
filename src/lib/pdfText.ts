// Tira o texto de um PDF mantendo o layout (linha a linha, colunas separadas por espaços),
// para o leitor de extrato funcionar igual ao texto com layout. A biblioteca só carrega quando usada.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export interface TextBit { str: string; x: number; y: number; w: number }

/** Junta os pedaços de texto em linhas (mesma altura) e separa colunas com espaços duplos. */
export function bitsToLines(bits: TextBit[]): string[] {
  const rows = new Map<number, TextBit[]>();
  for (const b of bits) {
    if (!b.str.trim()) continue;
    const key = [...rows.keys()].find((y) => Math.abs(y - b.y) < 2.5) ?? b.y;
    rows.set(key, [...(rows.get(key) ?? []), b]);
  }
  return [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, row]) => {
    row.sort((a, b) => a.x - b.x);
    let line = "", end = -Infinity;
    for (const b of row) {
      const gap = b.x - end;
      line += line ? (gap > 6 ? "    " : gap > 0.8 ? " " : "") : "";
      line += b.str.trim();
      end = b.x + b.w;
    }
    return line;
  });
}

interface PdfItem { str?: string; transform?: number[]; width?: number }

/** Texto de todas as páginas de um PDF (no navegador). */
export async function pdfToText(data: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    const bits = (content.items as PdfItem[]).filter((i) => i.str != null && i.transform)
      .map((i) => ({ str: i.str as string, x: (i.transform as number[])[4], y: (i.transform as number[])[5], w: i.width ?? 0 }));
    pages.push(bitsToLines(bits).join("\n"));
  }
  return pages.join("\n");
}
