import { useEffect, useState, type ReactNode } from "react";
import {
  DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCrmMutations } from "@/hooks/useCrm";
import type { Script } from "@/integrations/supabase/types";
import type { DragHandle } from "./ScriptItem";

function Sortable({ id, children }: { id: string; children: (drag: DragHandle) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? "relative z-10 opacity-80 shadow-xl" : undefined}>
      {children({ attributes, listeners })}
    </div>
  );
}

/** Lista de scripts que dá para reordenar arrastando pela alça (mouse, toque ou teclado). */
export function SortableScripts({ list, grid, enabled, render }: {
  list: Script[]; grid: boolean; enabled: boolean; render: (s: Script, drag?: DragHandle) => ReactNode;
}) {
  const { patch } = useCrmMutations("scripts");
  const [order, setOrder] = useState<string[]>(() => list.map((s) => s.id));
  useEffect(() => setOrder(list.map((s) => s.id)), [list]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(list.map((s) => [s.id, s]));
  const items = order.map((id) => byId.get(id)).filter(Boolean) as Script[];
  const cls = grid ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "space-y-1.5";

  if (!enabled) return <div className={cls}>{list.map((s) => <div key={s.id}>{render(s)}</div>)}</div>;

  // Troca só as posições dos scripts visíveis entre si: os escondidos pelo filtro ficam onde estavam.
  const onEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    setOrder(next);
    const slots = items.map((s) => s.position).sort((a, b) => a - b);
    const unique = new Set(slots).size === slots.length ? slots : slots.map((_, i) => (slots[0] ?? 0) + i);
    next.forEach((id, i) => { if (byId.get(id)?.position !== unique[i]) patch.mutate({ id, values: { position: unique[i] } }); });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEnd}>
      <SortableContext items={order} strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}>
        <div className={cls}>{items.map((s) => <Sortable key={s.id} id={s.id}>{(drag) => render(s, drag)}</Sortable>)}</div>
      </SortableContext>
    </DndContext>
  );
}
