import { useState } from 'react'
import { Trash2, Pencil } from 'lucide-react'
import { MARKER_KINDS } from '../../data/campaignMap'
import MapEntryModal from './MapEntryModal'

const MARKER_INDEX = Object.fromEntries(MARKER_KINDS.map(m => [m.kind, m]))
const LOCATION_KEYS = ['owner', 'faction', 'rules', 'buffs', 'notes']
const ROUTE_KEYS = ['owner', 'buffs', 'notes']

// Auto-populating detail table — one compact single-line row per icon + route.
// Each cell shows a truncated value with a hover tooltip carrying the full text.
// Clicking a row (creator) opens a popup editor; players click to highlight + hover
// to read. name/colour live on the marker and mirror onto the canvas; the rest live
// under table[id].
export default function MapTable({
  markers,
  lines = [],
  table,
  canEdit,
  selectedId,
  onSelect,
  setMarkerColor,
  setMarkerLabel,
  setTableField,
  onRemoveMarker,
  onRemoveLine,
}) {
  const [editingId, setEditingId] = useState(null)

  const nameFor = (id) => {
    const m = markers.find(mk => mk.id === id)
    if (!m) return '—'
    return m.label?.trim() || 'Unnamed location'
  }

  function handleRowClick(id) {
    if (canEdit) { onSelect?.(id); setEditingId(id) }
    else onSelect?.(selectedId === id ? null : id)
  }

  // Build the modal entry (location or route) for whatever id is open.
  function buildEntry(id) {
    const m = markers.find(mk => mk.id === id)
    if (m) {
      const info = MARKER_INDEX[m.kind]
      const row = table?.[id] ?? {}
      return {
        id, type: 'location', glyph: info?.glyph ?? '⬤',
        values: {
          name: m.label ?? '', color: m.color ?? info?.color ?? '#00e676',
          owner: row.owner ?? '', faction: row.faction ?? '',
          rules: row.rules ?? '', buffs: row.buffs ?? '', notes: row.notes ?? '',
        },
      }
    }
    const l = lines.find(ln => ln.id === id)
    if (l) {
      const row = table?.[id] ?? {}
      return {
        id, type: 'route', glyph: '⎯', connects: `${nameFor(l.fromId)} → ${nameFor(l.toId)}`,
        values: { name: row.name ?? '', owner: row.owner ?? '', buffs: row.buffs ?? '', notes: row.notes ?? '' },
      }
    }
    return null
  }

  function saveEntry(entry, draft) {
    if (entry.type === 'location') {
      setMarkerLabel(entry.id, draft.name ?? '')
      setMarkerColor(entry.id, draft.color)
      LOCATION_KEYS.forEach(k => setTableField(entry.id, k, draft[k] ?? ''))
    } else {
      setTableField(entry.id, 'name', draft.name ?? '')
      ROUTE_KEYS.forEach(k => setTableField(entry.id, k, draft[k] ?? ''))
    }
  }

  const editingEntry = editingId ? buildEntry(editingId) : null

  if (!markers.length && !lines.length) {
    return (
      <div className="border border-pip-mid/40 rounded bg-panel">
        <div className="px-3 py-2 border-b border-pip-mid/30">
          <h3 className="text-amber text-xs tracking-widest font-bold">MAP TABLE</h3>
        </div>
        <p className="text-muted/60 text-[11px] tracking-wider px-3 py-4">
          {canEdit ? 'Place an icon on the map to add a location row.' : 'No locations yet.'}
        </p>
      </div>
    )
  }

  return (
    <div className="border border-pip-mid/40 rounded bg-panel">
      <div className="px-3 py-2 border-b border-pip-mid/30 flex items-center gap-2">
        <h3 className="text-amber text-xs tracking-widest font-bold">MAP TABLE</h3>
        <span className="text-muted/50 text-[10px] tracking-widest ml-auto">
          {markers.length} {markers.length === 1 ? 'LOCATION' : 'LOCATIONS'}
          {lines.length > 0 && <> · {lines.length} {lines.length === 1 ? 'ROUTE' : 'ROUTES'}</>}
        </span>
      </div>

      {/* LOCATIONS */}
      {markers.length > 0 && (
        <div className="px-2 py-2">
          <HeaderRow
            cols={['NAME', 'OWNER', 'FACTION', 'RULES', 'BUFFS', 'NOTES']}
            widths={LOCATION_WIDTHS}
            canEdit={canEdit}
          />
          {markers.map(m => {
            const info = MARKER_INDEX[m.kind]
            const color = m.color ?? info?.color ?? '#00e676'
            const row = table?.[m.id] ?? {}
            return (
              <EntryRow
                key={m.id}
                glyph={info?.glyph ?? '⬤'}
                color={color}
                selected={selectedId === m.id}
                canEdit={canEdit}
                onClick={() => handleRowClick(m.id)}
                onEdit={() => { onSelect?.(m.id); setEditingId(m.id) }}
                onRemove={() => onRemoveMarker(m.id)}
                cells={[
                  { value: m.label, widthClass: LOCATION_WIDTHS[0], strong: true },
                  { value: row.owner, widthClass: LOCATION_WIDTHS[1] },
                  { value: row.faction, widthClass: LOCATION_WIDTHS[2] },
                  { value: row.rules, widthClass: LOCATION_WIDTHS[3] },
                  { value: row.buffs, widthClass: LOCATION_WIDTHS[4] },
                  { value: row.notes, widthClass: LOCATION_WIDTHS[5] },
                ]}
              />
            )
          })}
        </div>
      )}

      {/* ROUTES */}
      {lines.length > 0 && (
        <>
          <div className="px-3 py-1.5 border-y border-pip-mid/30 bg-panel-alt/40">
            <h4 className="text-pip text-[11px] tracking-widest font-bold">ROUTES</h4>
          </div>
          <div className="px-2 py-2">
            <HeaderRow
              cols={['NAME', 'CONNECTS', 'OWNER', 'BUFFS', 'NOTES']}
              widths={ROUTE_WIDTHS}
              canEdit={canEdit}
            />
            {lines.map(l => {
              const row = table?.[l.id] ?? {}
              return (
                <EntryRow
                  key={l.id}
                  glyph="⎯"
                  color="#3aa0ff"
                  selected={selectedId === l.id}
                  canEdit={canEdit}
                  onClick={() => handleRowClick(l.id)}
                  onEdit={() => { onSelect?.(l.id); setEditingId(l.id) }}
                  onRemove={() => onRemoveLine(l.id)}
                  cells={[
                    { value: row.name, widthClass: ROUTE_WIDTHS[0], strong: true },
                    { value: `${nameFor(l.fromId)} → ${nameFor(l.toId)}`, widthClass: ROUTE_WIDTHS[1] },
                    { value: row.owner, widthClass: ROUTE_WIDTHS[2] },
                    { value: row.buffs, widthClass: ROUTE_WIDTHS[3] },
                    { value: row.notes, widthClass: ROUTE_WIDTHS[4] },
                  ]}
                />
              )
            })}
          </div>
        </>
      )}

      {editingEntry && (
        <MapEntryModal
          entry={editingEntry}
          onSave={draft => saveEntry(editingEntry, draft)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  )
}

const LOCATION_WIDTHS = ['w-[16%]', 'w-[14%]', 'w-[12%]', 'flex-1', 'flex-1', 'flex-1']
const ROUTE_WIDTHS = ['w-[16%]', 'w-[20%]', 'w-[14%]', 'flex-1', 'flex-1']

function HeaderRow({ cols, widths, canEdit }) {
  return (
    <div className="flex items-center gap-2 px-2 pb-1">
      <span className="w-5 shrink-0" aria-hidden />
      {cols.map((c, i) => (
        <span key={c} className={`${widths[i]} min-w-0 text-muted/50 text-[9px] tracking-widest`}>{c}</span>
      ))}
      {canEdit && <span className="w-[52px] shrink-0" aria-hidden />}
    </div>
  )
}

function EntryRow({ glyph, color, selected, canEdit, onClick, onEdit, onRemove, cells }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-2 py-1 rounded border mb-1 cursor-pointer transition-colors ${
        selected ? 'border-amber/70 bg-panel-alt' : 'border-transparent hover:border-pip-mid hover:bg-panel-alt/60'
      }`}
      style={selected ? { boxShadow: '0 0 8px var(--color-amber-glow)' } : undefined}
    >
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold shrink-0"
        style={{ color, background: 'rgba(0,0,0,0.45)', border: `1px solid ${color}`, textShadow: `0 0 4px ${color}` }}
      >
        {glyph}
      </span>
      {cells.map((cell, i) => (
        <Cell key={i} value={cell.value} widthClass={cell.widthClass} strong={cell.strong} />
      ))}
      {canEdit && (
        <div className="w-[52px] shrink-0 flex items-center justify-end gap-1">
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            title="Edit this entry"
            className="inline-flex items-center justify-center w-6 h-6 rounded border border-pip-dim/40 text-pip/80 hover:border-pip hover:text-pip transition-colors"
          >
            <Pencil size={11} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onRemove() }}
            title="Delete this entry"
            className="inline-flex items-center justify-center w-6 h-6 rounded border border-muted/40 text-muted hover:border-danger hover:text-danger transition-colors"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

// Single-line cell with a hover tooltip carrying the full (untruncated) value.
function Cell({ value, widthClass, strong }) {
  const text = (value ?? '').toString().trim()
  return (
    <div className={`relative group ${widthClass} min-w-0`}>
      <span className={`block truncate text-xs tracking-wider ${
        text ? (strong ? 'text-pip' : 'text-pip/85') : 'text-muted/40'
      }`}>
        {text || '—'}
      </span>
      {text && (
        <div
          className="pointer-events-none absolute z-30 left-0 top-full mt-1 hidden group-hover:block min-w-[8rem] max-w-xs whitespace-pre-wrap break-words border border-pip-mid/60 bg-panel/95 text-pip text-[11px] leading-snug tracking-wider px-2 py-1 rounded"
          style={{ boxShadow: '0 0 8px var(--color-pip-glow)' }}
        >
          {text}
        </div>
      )}
    </div>
  )
}
