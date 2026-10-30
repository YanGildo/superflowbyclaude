import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow, ReactFlowProvider, Background, BackgroundVariant, Controls, MiniMap, MarkerType,
  addEdge, useEdgesState, useNodesState, useReactFlow,
  type Connection, type Edge, type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Check, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Funnel } from "@/integrations/supabase/types";
import { useFunnelMutations } from "@/hooks/useFunnels";
import { BLOCKS, blockDef, makeNode, type BlockData, type BlockKind, type BlockNode as BlockNodeT } from "./blocks";
import { BlockNode } from "./BlockNode";

const nodeTypes: NodeTypes = { block: BlockNode };
const defaultEdgeOptions = {
  type: "smoothstep",
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
  style: { strokeWidth: 1.75 },
};

function Palette({ onAdd }: { onAdd: (k: BlockKind) => void }) {
  const groups = useMemo(() => [...new Set(BLOCKS.map((b) => b.group))], []);
  return (
    <aside className="hidden w-48 shrink-0 space-y-4 overflow-y-auto border-r bg-card p-3 md:block">
      <p className="text-xs text-muted-foreground">Clique ou arraste para o quadro.</p>
      {groups.map((g) => (
        <div key={g}>
          <p className="brand-eyebrow mb-1.5">{g}</p>
          <div className="space-y-1">
            {BLOCKS.filter((b) => b.group === g).map((b) => (
              <button key={b.kind} draggable
                onDragStart={(e) => { e.dataTransfer.setData("application/superflow-block", b.kind); e.dataTransfer.effectAllowed = "move"; }}
                onClick={() => onAdd(b.kind)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent">
                <span className="flex size-6 items-center justify-center rounded text-white" style={{ background: b.color }}><b.icon className="size-3.5" /></span>
                {b.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}

function Inspector({
  node, edge, onNode, onEdge, onDelete,
}: {
  node: BlockNodeT | null; edge: Edge | null;
  onNode: (patch: Partial<BlockData>) => void; onEdge: (label: string) => void; onDelete: () => void;
}) {
  if (!node && !edge) {
    return (
      <aside className="hidden w-64 shrink-0 border-l bg-card p-4 text-sm text-muted-foreground xl:block">
        <p className="font-medium text-foreground">Dicas</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4">
          <li>Puxe da bolinha azul de um bloco até outro para ligar.</li>
          <li>Clique num bloco para editar nome e números.</li>
          <li>Selecione e aperte Delete para apagar.</li>
          <li>Tudo é salvo automaticamente.</li>
        </ul>
      </aside>
    );
  }
  const num = (v: string) => (v === "" ? null : Math.max(0, Number(v)));
  return (
    <aside className="w-64 shrink-0 space-y-3 overflow-y-auto border-l bg-card p-4">
      {node ? (
        <>
          <p className="brand-eyebrow">{blockDef(node.data.kind).label}</p>
          <div className="space-y-1.5">
            <Label htmlFor="blk-label">Nome</Label>
            <Input id="blk-label" value={node.data.label} onChange={(e) => onNode({ label: e.target.value })} />
          </div>
          {node.data.kind !== "nota" && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="blk-visits">Entram</Label>
                  <Input id="blk-visits" type="number" min={0} value={node.data.visits ?? ""} onChange={(e) => onNode({ visits: num(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="blk-conv">Avançam</Label>
                  <Input id="blk-conv" type="number" min={0} value={node.data.conversions ?? ""} onChange={(e) => onNode({ conversions: num(e.target.value) })} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">Números manuais por enquanto. A taxa aparece no bloco.</p>
              <div className="space-y-1.5">
                <Label htmlFor="blk-url">Link</Label>
                <Input id="blk-url" type="url" placeholder="https://" value={node.data.url ?? ""} onChange={(e) => onNode({ url: e.target.value })} />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="blk-note">Anotação</Label>
            <Textarea id="blk-note" rows={4} value={node.data.note ?? ""} onChange={(e) => onNode({ note: e.target.value })} />
          </div>
        </>
      ) : (
        <>
          <p className="brand-eyebrow">Conexão</p>
          <div className="space-y-1.5">
            <Label htmlFor="edge-label">Texto na seta</Label>
            <Input id="edge-label" placeholder="Ex.: 30% clicam" value={String(edge?.label ?? "")} onChange={(e) => onEdge(e.target.value)} />
          </div>
        </>
      )}
      <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={onDelete}>
        <Trash2 className="size-4" />Apagar {node ? "bloco" : "conexão"}
      </Button>
    </aside>
  );
}

function Editor({ funnel, onBack }: { funnel: Funnel; onBack: () => void }) {
  const { save } = useFunnelMutations();
  const [nodes, setNodes, onNodesChange] = useNodesState<BlockNodeT>((funnel.nodes ?? []) as BlockNodeT[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>((funnel.edges ?? []) as Edge[]);
  const [name, setName] = useState(funnel.name);
  const [status, setStatus] = useState<"salvo" | "salvando">("salvo");
  const { screenToFlowPosition } = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // salvamento automático (espera 800 ms sem mudanças)
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setStatus("salvando");
    const t = setTimeout(async () => {
      const clean = nodes.map(({ id, type, position, data }) => ({ id, type, position, data }));
      const cleanEdges = edges.map(({ id, source, target, label, type, sourceHandle, targetHandle }) => ({ id, source, target, label, type, sourceHandle, targetHandle }));
      await save.mutateAsync({ id: funnel.id, patch: { nodes: clean, edges: cleanEdges } }).catch(() => undefined);
      setStatus("salvo");
    }, 800);
    return () => clearTimeout(t);
  }, [nodes, edges]); // eslint-disable-line react-hooks/exhaustive-deps

  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge({ ...c, type: "smoothstep" }, es)), [setEdges]);

  /** Centro da área visível, com um pequeno deslocamento para blocos não se empilharem. */
  const viewCenter = () => {
    const r = wrapper.current?.getBoundingClientRect();
    const c = screenToFlowPosition({ x: (r?.left ?? 0) + (r?.width ?? 600) / 2 - 90, y: (r?.top ?? 0) + (r?.height ?? 400) / 2 - 30 });
    return { x: c.x + (nodes.length % 5) * 18, y: c.y + (nodes.length % 5) * 18 };
  };

  const addAt = (kind: BlockKind, pos?: { x: number; y: number }) => {
    const p = pos ?? viewCenter();
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), { ...makeNode(kind, p.x, p.y), selected: true }]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/superflow-block") as BlockKind;
    if (!kind) return;
    addAt(kind, screenToFlowPosition({ x: e.clientX - 90, y: e.clientY - 25 }));
  };

  const selNode = nodes.find((n) => n.selected) ?? null;
  const selEdge = selNode ? null : edges.find((e) => e.selected) ?? null;

  const saveName = () => {
    if (name.trim() && name.trim() !== funnel.name) save.mutate({ id: funnel.id, patch: { name: name.trim() } });
  };

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] flex-col md:-m-6">
      <div className="flex items-center gap-3 border-b bg-card px-4 py-2.5">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Voltar para a lista de funis"><ArrowLeft className="size-4" /></Button>
        <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          aria-label="Nome do funil" className="h-9 max-w-xs border-transparent font-heading font-semibold shadow-none hover:border-input" />
        <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
          {status === "salvando" ? <><Loader2 className="size-3.5 animate-spin" />Salvando…</> : <><Check className="size-3.5 text-success" />Salvo</>}
        </span>
      </div>
      <div className="flex min-h-0 flex-1">
        <Palette onAdd={(k) => addAt(k)} />
        <div ref={wrapper} className="min-w-0 flex-1" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes} edges={edges} nodeTypes={nodeTypes} defaultEdgeOptions={defaultEdgeOptions}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            fitView fitViewOptions={{ padding: 0.15, minZoom: 0.8, maxZoom: 1.1 }} minZoom={0.3} deleteKeyCode={["Delete", "Backspace"]}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="!hidden md:!block" nodeColor={(n) => blockDef(String((n.data as BlockData).kind)).color} />
          </ReactFlow>
        </div>
        <Inspector
          node={selNode} edge={selEdge}
          onNode={(patch) => setNodes((ns) => ns.map((n) => (n.id === selNode?.id ? { ...n, data: { ...n.data, ...patch } } : n)))}
          onEdge={(label) => setEdges((es) => es.map((e) => (e.id === selEdge?.id ? { ...e, label } : e)))}
          onDelete={() => {
            if (selNode) {
              setNodes((ns) => ns.filter((n) => n.id !== selNode.id));
              setEdges((es) => es.filter((e) => e.source !== selNode.id && e.target !== selNode.id));
            } else if (selEdge) setEdges((es) => es.filter((e) => e.id !== selEdge.id));
          }}
        />
      </div>
    </div>
  );
}

export function FunnelEditor(props: { funnel: Funnel; onBack: () => void }) {
  return <ReactFlowProvider><Editor {...props} /></ReactFlowProvider>;
}
