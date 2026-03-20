import { X, CheckCircle } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'

export default function ActiveEvents() {
  const { state, setState } = useCampaign()
  const events = state.activeEvents || []

  function handleComplete(index, cardId) {
    setState(prev => ({
      ...prev,
      activeEvents: prev.activeEvents.filter((_, i) => i !== index),
      eventCards: {
        ...prev.eventCards,
        [cardId]: { ...prev.eventCards[cardId], inPlay: false, complete: true },
      },
    }))
  }

  function handleRemove(index) {
    setState(prev => ({
      ...prev,
      activeEvents: prev.activeEvents.filter((_, i) => i !== index),
    }))
  }

  if (events.length === 0) {
    return (
      <div className="border border-pip-dim/30 border-dashed rounded-lg p-4 text-center">
        <p className="text-pip-dim text-xs">No active events. Draw cards above to add events in play.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event, i) => (
        <div key={i} className="border border-pip-dim rounded bg-panel-alt p-3 flex gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-amber text-xs">#{event.cardId}</span>
              <span className="text-pip text-sm font-bold truncate">{event.name}</span>
              <span className="text-pip-dim text-xs">R{event.sinceRound}</span>
            </div>
            <p className="text-pip-dim text-xs leading-relaxed">{event.text}</p>
            {event.consequence && (
              <p className="text-amber text-xs leading-relaxed mt-1 italic">{event.consequence}</p>
            )}
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <button
              onClick={() => handleComplete(i, event.cardId)}
              className="text-pip-dim hover:text-pip p-1" title="Complete"
            >
              <CheckCircle size={16} />
            </button>
            <button
              onClick={() => handleRemove(i)}
              className="text-pip-dim hover:text-danger p-1" title="Remove"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
