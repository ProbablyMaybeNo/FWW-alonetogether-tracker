import { useState } from 'react'
import { Dices } from 'lucide-react'
import Modal from '../layout/Modal'
import { useCampaign } from '../../context/CampaignContext'
import { rollFate } from '../../utils/fateTable'

const SKIP_FATES = ['Delayed', 'Lost', 'Captured', 'Pending']

function calcRestPreview(unit) {
  if (SKIP_FATES.includes(unit.fate)) return null
  const radDamage = unit.radDamage || 0
  const regDamage = unit.regDamage || 0
  const halfRad = Math.ceil(radDamage / 2)
  const newRad = radDamage - halfRad
  const regAfterRad = regDamage + halfRad
  const halfReg = Math.ceil(regAfterRad / 2)
  const newReg = regAfterRad - halfReg
  return { radDamage, regDamage, halfRad, newRad, regAfterRad, halfReg, newReg }
}

export default function NewRoundModal({ isOpen, onClose }) {
  const { state, setState } = useCampaign()
  const [pendingRolls, setPendingRolls] = useState({}) // slotId -> { result, applied }
  const [rollingFor, setRollingFor] = useState(null) // slotId currently showing inline roll UI
  const [rollResult, setRollResult] = useState(null)

  const roster = state.roster || []
  const pendingUnits = roster.filter(u => u.fate === 'Pending')
  const allPendingResolved = pendingUnits.every(u => pendingRolls[u.slotId]?.applied)

  function handleRollFate(unit) {
    setRollingFor(unit.slotId)
    setRollResult(null)
  }

  function handleDoRoll(unit) {
    const r = rollFate(unit.lucScore ?? 3, unit.removed ?? 0)
    setRollResult(r)
  }

  function handleApplyPendingFate(unit) {
    if (!rollResult) return
    const fateMap = {
      'Fine': 'Active',
      'Delayed': 'Delayed',
      'Lost': 'Lost',
      'Shaken': 'Shaken',
      'Captured': 'Captured',
      'Injured': 'Injured',
      'Dead': 'Dead',
    }
    const newFate = fateMap[rollResult.fate] || rollResult.fate
    setState(prev => ({
      ...prev,
      roster: prev.roster.map(u =>
        u.slotId === unit.slotId ? { ...u, fate: newFate } : u
      ),
    }))
    setPendingRolls(prev => ({
      ...prev,
      [unit.slotId]: { result: rollResult, applied: true, fate: newFate },
    }))
    setRollingFor(null)
    setRollResult(null)
  }

  function handleCancelRoll() {
    setRollingFor(null)
    setRollResult(null)
  }

  function handleCompleteRound() {
    setState(prev => {
      const newRoster = prev.roster.map(u => {
        let updated = { ...u, perksThisRound: 0 }

        if (SKIP_FATES.includes(u.fate)) {
          // delayed units return
          if (u.fate === 'Delayed') {
            updated.fate = 'Active'
          }
          return updated
        }

        // Clear injured arm if set
        if (u.condInjuredArm === true) {
          updated.condInjuredArm = false
        }
        if (u.fate === 'Injured') {
          updated.condInjuredArm = false
          updated.fate = 'Active'
        }

        // Damage rest: half rad converts to reg, then half reg discarded
        const radDamage = updated.radDamage ?? 0
        const regDamage = updated.regDamage ?? 0
        const halfRad = Math.ceil(radDamage / 2)
        const newRad = radDamage - halfRad
        const regAfterRad = regDamage + halfRad
        const halfReg = Math.ceil(regAfterRad / 2)
        const newReg = regAfterRad - halfReg
        updated.radDamage = newRad
        updated.regDamage = newReg

        // Clear one condition (priority: Poisoned, then Leg)
        if (updated.condPoisoned) {
          updated.condPoisoned = false
        } else if (updated.condInjuredLeg) {
          updated.condInjuredLeg = false
        }

        return updated
      })

      return {
        ...prev,
        round: (prev.round || 0) + 1,
        exploreCardsThisRound: 0,
        roster: newRoster,
        settlement: {
          ...prev.settlement,
          structures: (prev.settlement.structures || []).map(s => ({ ...s, usedThisRound: false })),
        },
      }
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="NEW SETTLEMENT ROUND" wide>
      <div className="space-y-5">

        {/* Section 1: Rest Effects Preview */}
        <div>
          <h3 className="text-pip text-sm tracking-wider mb-3 border-b border-pip-dim/30 pb-1">
            REST EFFECTS PREVIEW
          </h3>
          {roster.length === 0 ? (
            <p className="text-pip-dim text-xs">No units on roster.</p>
          ) : (
            <div className="space-y-1">
              {roster.map(unit => {
                const skipped = SKIP_FATES.includes(unit.fate)
                const willReturn = unit.fate === 'Delayed'
                const willClearInjuredArm = unit.condInjuredArm || unit.fate === 'Injured'
                const preview = !skipped ? calcRestPreview(unit) : null

                return (
                  <div key={unit.slotId} className={`border rounded px-3 py-2 text-xs ${
                    skipped ? 'border-pip-dim/20 bg-panel-alt opacity-60' : 'border-pip-dim/40 bg-panel'
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-pip font-bold">{unit.unitName}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs ${
                        unit.fate === 'Active' ? 'bg-pip-dim/30 text-pip' :
                        unit.fate === 'Pending' ? 'bg-amber-dim/30 text-amber' :
                        unit.fate === 'Dead' ? 'bg-danger-dim/50 text-danger' :
                        'bg-amber-dim/30 text-amber'
                      }`}>{unit.fate}</span>

                      {skipped && !willReturn && (
                        <span className="text-pip-dim">(skipped — not present)</span>
                      )}
                      {willReturn && (
                        <span className="text-pip">Returns to Active</span>
                      )}
                      {!skipped && willClearInjuredArm && (
                        <span className="text-pip">Injured Arm cleared</span>
                      )}
                      {!skipped && unit.fate === 'Injured' && (
                        <span className="text-pip">→ Active</span>
                      )}
                    </div>

                    {preview && (preview.radDamage > 0 || preview.regDamage > 0) && (
                      <div className="mt-1 text-pip-dim">
                        Damage rest:{' '}
                        {preview.radDamage > 0 && (
                          <span>Rad: <span className="text-amber">{preview.radDamage}</span>→<span className="text-pip">{preview.newRad}</span>{' '}</span>
                        )}
                        <span>Reg: <span className="text-amber">{preview.regDamage}</span>→<span className="text-pip">{preview.newReg}</span>
                          {preview.halfRad > 0 && <span className="text-pip-dim"> (was {preview.regDamage} + {preview.halfRad} from rad)</span>}
                        </span>
                      </div>
                    )}
                    {preview && preview.radDamage === 0 && preview.regDamage === 0 && (
                      <div className="mt-1 text-pip-dim">No damage to rest off</div>
                    )}

                    {!skipped && (unit.condPoisoned || unit.condInjuredLeg) && (
                      <div className="mt-1 text-pip-dim">
                        Condition cleared:{' '}
                        <span className="text-pip">
                          {unit.condPoisoned ? 'Poisoned' : 'Injured Leg'}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Section 2: Pending Fate Rolls */}
        {pendingUnits.length > 0 && (
          <div>
            <h3 className="text-pip text-sm tracking-wider mb-3 border-b border-pip-dim/30 pb-1">
              PENDING FATE ROLLS ({pendingUnits.length})
            </h3>
            <p className="text-pip-dim text-xs mb-3">
              These units were removed in battle with fate not yet determined. Roll their fate now or proceed without rolling.
            </p>
            <div className="space-y-2">
              {pendingUnits.map(unit => {
                const rolled = pendingRolls[unit.slotId]
                const isRollingThis = rollingFor === unit.slotId

                return (
                  <div key={unit.slotId} className="border border-amber/40 rounded px-3 py-2 bg-amber-dim/5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-amber font-bold text-sm">{unit.unitName} — ?</span>
                      {!rolled?.applied && !isRollingThis && (
                        <button
                          onClick={() => handleRollFate(unit)}
                          className="flex items-center gap-1 text-xs px-3 py-1 border border-pip rounded text-pip hover:bg-pip-dim/30"
                        >
                          <Dices size={12} /> ROLL FATE
                        </button>
                      )}
                      {rolled?.applied && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          rolled.fate === 'Dead' ? 'bg-danger-dim/50 text-danger' :
                          rolled.fate === 'Active' ? 'bg-pip-dim/30 text-pip' :
                          'bg-amber-dim/30 text-amber'
                        }`}>
                          {rolled.result.diceResult} → {rolled.fate.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Inline roll UI */}
                    {isRollingThis && (
                      <div className="mt-2 border-t border-pip-dim/30 pt-2 space-y-2">
                        <div className="text-xs text-pip-dim">
                          Luc: {unit.lucScore ?? 3} | Removed: {unit.removed ?? 0} | Threshold: {(unit.lucScore ?? 3) + 5 - (unit.removed ?? 0)}
                        </div>
                        <button
                          onClick={() => handleDoRoll(unit)}
                          className="flex items-center gap-1 text-xs px-3 py-1 border border-pip rounded text-pip hover:bg-pip-dim/30"
                        >
                          <Dices size={12} /> ROLL
                        </button>
                        {rollResult && (
                          <div className="border border-pip-dim rounded bg-panel-alt p-2 text-center space-y-1">
                            <div className="text-amber font-bold">{rollResult.diceResult}</div>
                            <div className={`font-bold ${
                              rollResult.fate === 'Dead' ? 'text-danger' :
                              rollResult.fate === 'Fine' ? 'text-pip' : 'text-amber'
                            }`}>{rollResult.fate.toUpperCase()}</div>
                            <p className="text-pip-dim text-xs">{rollResult.description}</p>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleApplyPendingFate(unit)}
                                className="flex-1 py-1.5 border border-pip text-pip rounded text-xs hover:bg-pip-dim/30"
                              >
                                APPLY
                              </button>
                              <button
                                onClick={handleCancelRoll}
                                className="flex-1 py-1.5 border border-pip-dim text-pip-dim rounded text-xs hover:text-pip"
                              >
                                CANCEL
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {!allPendingResolved && (
              <p className="text-amber text-xs mt-2">
                Don't forget to roll Fate for any Pending (?) units before the next battle.
              </p>
            )}
          </div>
        )}

        {/* Confirmation note */}
        <div className="border border-pip-dim/30 rounded bg-panel-alt px-3 py-2 text-xs text-pip-dim space-y-1">
          <p>When you click APPLY REST AND START ROUND:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Round counter increments by 1</li>
            <li>Explore cards this round resets to 0</li>
            <li>All structures reset to unused</li>
            <li>Rest damage applied to all present units</li>
            <li>Delayed units return to Active</li>
            <li>Perks-this-round counter resets for all units</li>
          </ul>
        </div>

        <button
          onClick={handleCompleteRound}
          className="w-full py-3 border border-pip text-pip rounded text-sm font-bold tracking-wider hover:bg-pip-dim/30 transition-colors"
        >
          APPLY REST &amp; START ROUND {(state.round || 0) + 1}
        </button>
      </div>
    </Modal>
  )
}
