import { useState } from 'react'
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
