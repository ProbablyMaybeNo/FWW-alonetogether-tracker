import { useState, useEffect } from 'react'
import Modal from '../layout/Modal'

// Barracks Modal — discard 1 condition from a unit
export function BarracksModal({ isOpen, onClose, roster, onApply }) {
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [selectedCond, setSelectedCond] = useState(null)

  const eligibleUnits = roster.filter(u =>
    u.condPoisoned || u.condInjuredArm || u.condInjuredLeg
  )

  function getConditions(unit) {
    const conds = []
    if (unit.condPoisoned) conds.push({ key: 'condPoisoned', label: 'Poisoned' })
    if (unit.condInjuredArm) conds.push({ key: 'condInjuredArm', label: 'Injured Arm' })
    if (unit.condInjuredLeg) conds.push({ key: 'condInjuredLeg', label: 'Injured Leg' })
    return conds
  }

  function handleConfirm() {
    if (!selectedUnit || !selectedCond) return
    onApply(selectedUnit.slotId, selectedCond)
    setSelectedUnit(null)
    setSelectedCond(null)
    onClose()
  }

  function handleClose() {
    setSelectedUnit(null)
    setSelectedCond(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="BARRACKS — Discard 1 Condition">
      <div className="space-y-4">
        <p className="text-muted text-xs">Requires 2 Power and 1 Water. Remove one condition from a unit.</p>

        {eligibleUnits.length === 0 ? (
          <p className="text-muted text-xs">No units with active conditions.</p>
        ) : (
          <>
            <div>
              <label className="text-xs text-muted block mb-2">SELECT UNIT</label>
              <div className="space-y-1">
                {eligibleUnits.map(unit => (
                  <button
                    key={unit.slotId}
                    onClick={() => { setSelectedUnit(unit); setSelectedCond(null) }}
                    className={`w-full text-left px-3 py-2 border rounded text-xs transition-colors ${
                      selectedUnit?.slotId === unit.slotId
                        ? 'border-pip text-pip bg-pip-dim/20'
                        : 'border-muted/40 text-muted hover:text-pip'
                    }`}
                  >
                    {unit.unitName}
                    <span className="ml-2 text-muted">
                      ({getConditions(unit).map(c => c.label).join(', ')})
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {selectedUnit && (
              <div>
                <label className="text-xs text-muted block mb-2">SELECT CONDITION TO CLEAR</label>
                <div className="flex gap-2 flex-wrap">
                  {getConditions(selectedUnit).map(cond => (
                    <button
                      key={cond.key}
                      onClick={() => setSelectedCond(cond.key)}
                      className={`text-xs px-3 py-1.5 border rounded transition-colors ${
                        selectedCond === cond.key
                          ? 'border-pip text-pip bg-pip-dim/20'
                          : 'border-danger/40 text-danger hover:bg-danger-dim/10'
                      }`}
                    >
                      {cond.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleConfirm}
                disabled={!selectedUnit || !selectedCond}
                className="flex-1 py-2 border border-pip text-pip rounded text-xs hover:bg-pip-dim/30 disabled:opacity-40"
              >
                APPLY
              </button>
              <button onClick={handleClose} className="flex-1 py-2 border border-muted text-muted rounded text-xs hover:text-pip">
                CANCEL
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

// Stores Modal — prepare battle hand (1 Item or 2 Boosts per use)
export function StoresModal({ isOpen, onClose, poolItems = [], roster = [], onApply }) {
  const [selected, setSelected] = useState([])
  const [assignments, setAssignments] = useState({})

  const available = poolItems.filter(item => !['stores', 'locker'].includes(item.location))

  const selectedBoosts = selected.filter(id => {
    const item = poolItems.find(p => p.id === id)
    return item?.isBoost === true
  })
  const selectedNonBoosts = selected.filter(id => {
    const item = poolItems.find(p => p.id === id)
    return item?.isBoost === false || item?.isBoost === undefined
  })

  function canSelect(item) {
    if (selected.includes(item.id)) return true
    if (item.isBoost) return selectedBoosts.length < 2
    else return selectedNonBoosts.length < 1
  }

  function toggleItem(itemId) {
    const item = poolItems.find(p => p.id === itemId)
    if (!item) return
    if (selected.includes(itemId)) {
      setSelected(prev => prev.filter(id => id !== itemId))
      setAssignments(prev => { const next = { ...prev }; delete next[itemId]; return next })
    } else if (canSelect(item)) {
      setSelected(prev => [...prev, itemId])
    }
  }

  function handleConfirm() {
    onApply(selected.map(id => ({ id, unitSlotId: assignments[id] ?? null })))
    handleClose()
  }

  function handleClose() {
    setSelected([])
    setAssignments({})
    onClose()
  }

  useEffect(() => {
    if (!isOpen) {
      setSelected([])
      setAssignments({})
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="STORES — Prepare Battle Hand" wide>
      <div className="space-y-4">
        <p className="text-muted text-xs">Select up to 1 Item or up to 2 Boosts from your pool to bring into the next battle.</p>
        <div className="text-xs text-muted">
          Selected: <span className="text-pip font-bold">{selectedNonBoosts.length}/1</span> items,{' '}
          <span className="text-amber font-bold">{selectedBoosts.length}/2</span> boosts
        </div>

        <div className="max-h-80 overflow-y-auto space-y-1">
          {available.length === 0 && <p className="text-muted text-xs">No items available in pool.</p>}
          {available.map(item => {
            const isSel = selected.includes(item.id)
            const disabled = !isSel && !canSelect(item)
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 border rounded px-3 py-2 transition-colors ${
                  isSel ? 'border-pip bg-pip-dim/20 cursor-pointer' :
                  disabled ? 'border-muted/20 opacity-40 cursor-not-allowed' :
                  'border-muted/40 hover:border-pip/60 hover:bg-panel-light cursor-pointer'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSel ? 'border-pip bg-pip' : 'border-muted'}`}
                  onClick={() => !disabled && toggleItem(item.id)}
                >
                  {isSel && <span className="text-terminal text-xs font-bold leading-none">✓</span>}
                </div>
                <div className="flex-1 min-w-0" onClick={() => !disabled && toggleItem(item.id)}>
                  <span className="text-pip text-sm font-bold">{item.name}</span>
                  {item.isBoost && <span className="ml-2 text-amber text-xs font-bold">BOOST</span>}
                </div>
                <span className="text-muted text-xs">{item.subType}</span>
                <span className="text-amber text-xs font-bold">{item.caps}c</span>
                {isSel && (
                  <select
                    value={assignments[item.id] ?? ''}
                    onChange={e => setAssignments(prev => ({ ...prev, [item.id]: e.target.value ? parseInt(e.target.value) : null }))}
                    className="text-xs py-0.5 px-1 ml-1"
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="">No unit</option>
                    {roster.filter(u => u.fate !== 'Dead').map(u => (
                      <option key={u.slotId} value={u.slotId}>{u.unitName}</option>
                    ))}
                  </select>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 border border-pip text-pip rounded text-xs hover:bg-pip-dim/30"
          >
            CONFIRM ({selected.length} items)
          </button>
          <button onClick={handleClose} className="flex-1 py-2 border border-muted text-muted rounded text-xs hover:text-pip">
            CANCEL
          </button>
        </div>
      </div>
    </Modal>
  )
}

// Medical Center Modal — heal 2 damage or remove addiction
export function MedicalCenterModal({ isOpen, onClose, roster, onApply }) {
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [action, setAction] = useState(null)

  function handleConfirm() {
    if (!selectedUnit || !action) return
    onApply(selectedUnit.slotId, action)
    setSelectedUnit(null)
    setAction(null)
    onClose()
  }

  function handleClose() {
    setSelectedUnit(null)
    setAction(null)
    onClose()
  }

  const activeRoster = roster.filter(u => u.fate !== 'Dead')

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="MEDICAL CENTER — Heal or Cure">
      <div className="space-y-4">
        <p className="text-muted text-xs">Requires 2 Power and 1 Water.</p>

        <div>
          <label className="text-xs text-muted block mb-2">SELECT UNIT</label>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {activeRoster.map(unit => (
              <button
                key={unit.slotId}
                onClick={() => { setSelectedUnit(unit); setAction(null) }}
                className={`w-full text-left px-3 py-2 border rounded text-xs transition-colors ${
                  selectedUnit?.slotId === unit.slotId
                    ? 'border-pip text-pip bg-pip-dim/20'
                    : 'border-muted/40 text-muted hover:text-pip'
                }`}
              >
                {unit.unitName}
                <span className="ml-2 text-muted">
                  Reg: {unit.regDamage || 0} | Rad: {unit.radDamage || 0}
                  {unit.addiction ? ` | Addiction: ${unit.addiction}` : ''}
                </span>
              </button>
            ))}
          </div>
        </div>

        {selectedUnit && (
          <div>
            <label className="text-xs text-muted block mb-2">SELECT ACTION</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setAction('heal')}
                className={`text-xs px-3 py-1.5 border rounded transition-colors ${
                  action === 'heal' ? 'border-pip text-pip bg-pip-dim/20' : 'border-muted/40 text-muted hover:text-pip'
                }`}
              >
                Heal 2 Damage (Reg: {selectedUnit.regDamage || 0} → {Math.max(0, (selectedUnit.regDamage || 0) - 2)})
              </button>
              {selectedUnit.addiction && (
                <button
                  onClick={() => setAction('addiction')}
                  className={`text-xs px-3 py-1.5 border rounded transition-colors ${
                    action === 'addiction' ? 'border-pip text-pip bg-pip-dim/20' : 'border-muted/40 text-muted hover:text-pip'
                  }`}
                >
                  Remove Addiction ({selectedUnit.addiction})
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleConfirm}
            disabled={!selectedUnit || !action}
            className="flex-1 py-2 border border-pip text-pip rounded text-xs hover:bg-pip-dim/30 disabled:opacity-40"
          >
            APPLY
          </button>
          <button onClick={handleClose} className="flex-1 py-2 border border-muted text-muted rounded text-xs hover:text-pip">
            CANCEL
          </button>
        </div>
      </div>
    </Modal>
  )
}
