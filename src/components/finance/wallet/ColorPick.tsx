import { WALLET_COLORS } from "@/lib/finance";

export function ColorPick({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Cor">
      {WALLET_COLORS.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={`Cor ${c}`} onClick={() => onChange(c)}
          className="size-6 rounded-full ring-offset-2 ring-offset-background aria-checked:ring-2 aria-checked:ring-ring" style={{ background: c }} />
      ))}
    </div>
  );
}
