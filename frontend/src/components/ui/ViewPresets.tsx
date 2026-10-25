import type { ViewPreset } from '../../store/gameStore'

const PRESETS: { id: ViewPreset; label: string }[] = [
  { id: 'red', label: 'Côté Rouge' },
  { id: 'blue', label: 'Côté Bleu' },
  { id: 'top', label: 'Dessus' },
  { id: 'left', label: 'Gauche' },
  { id: 'right', label: 'Droite' },
  { id: 'iso-red-left', label: 'Iso R-G' },
  { id: 'iso-red-right', label: 'Iso R-D' },
  { id: 'iso-blue-left', label: 'Iso B-G' },
  { id: 'iso-blue-right', label: 'Iso B-D' },
]

export default function ViewPresets({ value, onChange }: { value: ViewPreset; onChange: (v: ViewPreset) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
            value === p.id ? 'bg-accent text-black' : 'bg-panel text-ink-muted hover:bg-line hover:text-ink'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
