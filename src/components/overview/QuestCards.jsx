import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'

export default function QuestCards() {
  const { state, setState } = useCampaign()
  const [newQuest, setNewQuest] = useState('')
  const quests = state.questCards || []

  function handleAdd() {
    if (!newQuest.trim()) return
    setState(prev => ({
      ...prev,
      questCards: [...prev.questCards, { name: newQuest.trim(), active: true }],
    }))
    setNewQuest('')
  }

  function handleRemove(index) {
    setState(prev => ({
      ...prev,
      questCards: prev.questCards.filter((_, i) => i !== index),
    }))
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newQuest}
          onChange={(e) => setNewQuest(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="Add quest card..."
          className="flex-1 text-xs"
        />
        <button onClick={handleAdd} className="px-3 py-1 border border-pip-dim text-pip text-sm rounded hover:bg-pip-dim/30">
          <Plus size={14} />
        </button>
      </div>
      {quests.length === 0 ? (
        <p className="text-pip-dim text-xs text-center py-2">No active quests</p>
      ) : (
        <div className="space-y-1">
          {quests.map((q, i) => (
            <div key={i} className="flex items-center justify-between border border-pip-dim/30 rounded px-3 py-2 bg-panel-alt">
              <span className="text-pip text-xs">{q.name}</span>
              <button onClick={() => handleRemove(i)} className="text-pip-dim hover:text-danger p-1">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
