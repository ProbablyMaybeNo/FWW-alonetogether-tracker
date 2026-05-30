import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { getItemRef } from '../../utils/calculations'
import AddItemModal from '../roster/AddItemModal'

const genId = () => Date.now() + Math.random()

// A freeform item pool the player fills by hand — independent of the
// battle-recovery / settlement-deck flow. Items live at location 'manual',
// so round-end cleanup (App.jsx) never sells or moves them. From here a
// player can equip an item to a unit or sell it for its cap value.
export default function ManualPoolPanel() {
  const { state, setState } = useCampaign()
  const [showAdd, setShowAdd] = useState(false)

  const items = (state.itemPool?.items || []).filter(i => i.location === 'manual')
  const roster = state.roster || []
  const totalValue = items.reduce((s, i) => s + (i.caps || 0), 0)

  function addItem(catalogId) {
    const ref = getItemRef(catalogId)
    if (!ref) return
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: [...(prev.itemPool?.items || []), {
          id: genId(),
          catalogId,
          name: ref.name ?? '',
          caps: ref.caps ?? 0,
          subType: ref.subType ?? 'Other',
          isBoost: false,
          boostId: null,
          boostType: null,
          location: 'manual',
          assignedUnit: null,
        }],
      },
    }))
  }

  function removeItem(id) {
    setState(prev => ({
      ...prev,
      itemPool: { ...prev.itemPool, items: (prev.itemPool?.items || []).filter(i => i.id !== id) },
    }))
  }

  function discardItem(item) {
    if (!confirm(`Discard "${item.name}"? This removes it with no caps refund.`)) return
    removeItem(item.id)
  }

  function sellItem(item) {
    setState(prev => ({
      ...prev,
      caps: (prev.caps || 0) + (item.caps || 0),
      itemPool: { ...prev.itemPool, items: (prev.itemPool?.items || []).filter(i => i.id !== item.id) },
    }))
  }

  function sellAll() {
    if (!items.length) return
    if (!confirm(`Sell all ${items.length} stash item${items.length !== 1 ? 's' : ''} for ${totalValue}c?`)) return
    const ids = new Set(items.map(i => i.id))
    setState(prev => ({
      ...prev,
      caps: (prev.caps || 0) + totalValue,
      itemPool: { ...prev.itemPool, items: (prev.itemPool?.items || []).filter(i => !ids.has(i.id)) },
    }))
  }

  function equipToUnit(item, slotId) {
    const catId = item.catalogId ?? item.id
    setState(prev => ({
      ...prev,
      roster: (prev.roster || []).map(u =>
        String(u.slotId) === String(slotId)
          ? { ...u, equippedItems: [...(u.equippedItems || []), catId] }
          : u
      ),
      itemPool: { ...prev.itemPool, items: (prev.itemPool?.items || []).filter(i => i.id !== item.id) },
    }))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <p className="text-muted text-xs">
          Hand-managed stash — items you add directly. Untouched by round-end cleanup. Equip to a unit or sell for caps.
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 text-xs px-3 py-1.5 border border-pip text-pip rounded hover:bg-pip-dim/20 font-bold tracking-wider shrink-0"
        >
          <Plus size={12} /> ADD ITEM
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-muted text-xs">No items in stash. Click ADD ITEM to add one from the catalog.</p>
      ) : (
        <div className="space-y-1">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2 border border-pip-mid/30 border-l-2 border-l-amber/60 rounded px-3 py-2 bg-panel-light flex-wrap"
            >
              <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
              <span className="text-muted text-xs px-1.5 py-0.5 border border-muted/40 rounded">{item.subType}</span>
              <span className="text-amber text-xs font-bold">{item.caps}c</span>
              <div className="flex gap-1 flex-wrap">
                <EquipButton
                  roster={roster}
                  onEquip={(slotId) => equipToUnit(item, slotId)}
                />
                <button
                  onClick={() => sellItem(item)}
                  className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20"
                >
                  Sell {item.caps}c
                </button>
                <button
                  onClick={() => discardItem(item)}
                  title="Discard (no caps refund)"
                  className="text-xs p-1 border border-muted/40 rounded text-muted hover:text-danger hover:border-danger transition-colors"
                  aria-label="Discard item"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          <div className="pt-2">
            <button
              onClick={sellAll}
              className="text-xs px-4 py-2 border border-amber/40 text-amber rounded hover:bg-amber-dim/10 transition-colors"
            >
              SELL ALL ({totalValue}c)
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <AddItemModal
          isOpen={showAdd}
          onClose={() => setShowAdd(false)}
          onAdd={(catalogId) => addItem(catalogId)}
          poolItems={[]}
        />
      )}
    </div>
  )
}

function EquipButton({ roster, onEquip }) {
  const [open, setOpen] = useState(false)
  const equipable = roster.filter(u => u.fate !== 'Dead')

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        disabled={equipable.length === 0}
        title={equipable.length === 0 ? 'No units in roster' : 'Equip to a unit'}
        className="text-xs px-2 py-0.5 border border-pip/50 rounded text-pip hover:bg-pip-dim/20 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Equip
      </button>
    )
  }

  return (
    <div className="flex gap-1 flex-wrap items-center">
      <select
        autoFocus
        onChange={(e) => {
          if (e.target.value) {
            onEquip(e.target.value)
            setOpen(false)
          }
        }}
        defaultValue=""
        className="text-xs py-0.5 px-1"
      >
        <option value="">Pick unit...</option>
        {equipable.map(u => (
          <option key={u.slotId} value={u.slotId}>{u.unitName}</option>
        ))}
      </select>
      <button onClick={() => setOpen(false)} className="text-muted hover:text-danger" aria-label="Cancel">
        <X size={12} />
      </button>
    </div>
  )
}
