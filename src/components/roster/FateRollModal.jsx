import { useState } from 'react'
import { Dices } from 'lucide-react'
import Modal from '../layout/Modal'
import { rollFate } from '../../utils/fateTable'

export default function FateRollModal({ isOpen, onClose, unit, onApply }) {
  const [lucScore, setLucScore] = useState(unit?.lucScore ?? 3)
  const [result, setResult] = useState(null)

  function handleRoll() {
    const r = rollFate(lucScore, unit?.removed ?? 0)
    setResult(r)
  }

  function handleApply() {
    if (!result) return
    onApply(result.fate)
    setResult(null)
    onClose()
  }

  function handleClose() {
    setResult(null)
    onClose()
  }

  if (!unit) return null

  const timesRemoved = unit.removed ?? 0
  const threshold = lucScore + 5 - timesRemoved

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`FATE ROLL — ${unit.unitName}`}>
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted block mb-1">LUC SCORE</label>
            <input
              type="number" min="0" max="10"
              value={lucScore}
              onChange={(e) => { setLucScore(parseInt(e.target.value) || 0); setResult(null) }}
              className="w-full text-xs py-1 px-2"
            />
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">TIMES REMOVED</label>
            <div className="text-pip text-sm py-1">{timesRemoved}</div>
          </div>
          <div>
            <label className="text-xs text-muted block mb-1">THRESHOLD</label>
            <div className="text-amber text-sm py-1">
              {lucScore} + 5 − {timesRemoved} = <span className="font-bold">{threshold}</span>
            </div>
          </div>
        </div>

        {/* Roll Button */}
        <button
          onClick={handleRoll}
          className="w-full flex items-center justify-center gap-2 py-3 border border-pip rounded text-pip text-sm font-bold hover:bg-pip-dim hover:border-pip-mid transition-colors"
          style={{ boxShadow: '0 0 8px var(--color-pip-glow)' }}
        >
          <Dices size={18} /> ROLL FATE
        </button>

        {/* Result */}
        {result && (
          <div className="border border-muted/40 rounded bg-panel-alt p-4 space-y-2 text-center">
            <div className="text-title text-2xl font-bold tracking-wider">{result.diceResult}</div>
            <div className={`text-lg font-bold tracking-wide ${
              result.fate === 'Dead' ? 'text-danger' :
              result.fate === 'Fine' ? 'text-pip' : 'text-amber'
            }`}>{result.fate.toUpperCase()}</div>
            <p className="text-muted text-xs">{result.description}</p>

            {result.fate === 'Dead' && (
              <div className="border border-danger rounded px-3 py-2 text-danger text-xs font-bold" style={{ boxShadow: '0 0 8px var(--color-danger-glow)' }}>
                PERMANENT — this cannot be undone
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleApply}
                className={`flex-1 py-2 border rounded text-sm transition-colors ${
                  result.fate === 'Dead'
                    ? 'border-danger text-danger hover:bg-danger-dim/20'
                    : 'border-pip text-pip hover:bg-pip-dim/30'
                }`}
              >
                APPLY RESULT
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-2 border border-muted/40 text-muted rounded text-sm hover:text-pip transition-colors"
              >
                DISMISS
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
