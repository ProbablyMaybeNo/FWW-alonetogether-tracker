import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

// Click-to-edit popup for a single map table entry (a location icon or a route line).
// Edits are held in a local draft and committed only on SAVE & CLOSE.
const LOCATION_FIELDS = [
  { key: 'name',    label: 'Name',              type: 'text', placeholder: 'Location name' },
  { key: 'owner',   label: 'Owner / assignment', type: 'text' },
  { key: 'faction', label: 'Faction',           type: 'text' },
  { key: 'rules',   label: 'Rules',             type: 'area' },
  { key: 'buffs',   label: 'Buffs',             type: 'area' },
  { key: 'notes',   label: 'Notes',             type: 'area' },
]
const ROUTE_FIELDS = [
  { key: 'name',  label: 'Name',  type: 'text', placeholder: 'Route name' },
  { key: 'owner', label: 'Owner', type: 'text' },
  { key: 'buffs', label: 'Buffs', type: 'area' },
  { key: 'notes', label: 'Notes', type: 'area' },
]

export default function MapEntryModal({ entry, onSave, onClose }) {
  const fields = entry.type === 'route' ? ROUTE_FIELDS : LOCATION_FIELDS
  const [draft, setDraft] = useState(entry.values)
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSave() { onSave(draft); onClose() }

  const color = draft.color ?? '#00e676'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md border border-amber/50 rounded-lg bg-panel"
        style={{ boxShadow: '0 0 24px var(--color-amber-glow)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-pip-mid/30">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-bold shrink-0"
            style={{ color, background: 'rgba(0,0,0,0.45)', border: `1px solid ${color}`, textShadow: `0 0 4px ${color}` }}
          >
            {entry.glyph}
          </span>
          <h3 className="text-amber text-sm tracking-widest font-bold">
            {entry.type === 'route' ? 'ROUTE' : 'LOCATION'}
          </h3>
          {entry.type === 'route' && (
            <span className="text-muted/60 text-[11px] tracking-wider ml-1 truncate">{entry.connects}</span>
          )}
          <button onClick={onClose} title="Close without saving"
            className="ml-auto text-muted hover:text-pip transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {entry.type === 'location' && (
            <label className="flex items-center gap-2">
              <span className="text-muted/60 text-[10px] tracking-widest w-28">ICON COLOUR</span>
              <input type="color" value={color} onChange={e => set('color', e.target.value)}
                className="w-8 h-8 !p-0.5 cursor-pointer" />
            </label>
          )}
          {entry.type === 'route' && (
            <div>
              <span className="block text-muted/60 text-[10px] tracking-widest mb-0.5">CONNECTS</span>
              <p className="text-pip/90 text-xs tracking-wider break-words">{entry.connects}</p>
            </div>
          )}
          {fields.map(f => (
            <label key={f.key} className="block">
              <span className="block text-muted/60 text-[10px] tracking-widest mb-0.5">{f.label.toUpperCase()}</span>
              {f.type === 'area' ? (
                <textarea value={draft[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} rows={3}
                  placeholder={f.placeholder}
                  className="w-full text-sm !py-1.5 !px-2 resize-none" />
              ) : (
                <input value={draft[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full text-sm !py-1.5 !px-2" />
              )}
            </label>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 py-3 border-t border-pip-mid/30">
          <button onClick={onClose}
            className="text-[10px] tracking-widest px-3 py-1.5 border border-muted/40 rounded text-muted hover:border-pip hover:text-pip transition-colors">
            CANCEL
          </button>
          <button onClick={handleSave}
            className="ml-auto inline-flex items-center gap-1.5 text-[10px] tracking-widest px-4 py-1.5 border border-pip rounded text-pip bg-pip-dim/20 hover:bg-pip-dim/30 transition-colors"
            style={{ boxShadow: '0 0 8px var(--color-pip-glow)' }}>
            SAVE &amp; CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}
