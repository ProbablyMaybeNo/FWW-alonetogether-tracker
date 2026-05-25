import { useState } from 'react'
import { X } from 'lucide-react'
import Modal from '../layout/Modal'

// Per-player narrative journal. Writes to state.narrativeLog (per-player Supabase
// row). Separate from sharedState.campaignNarratives (creator-edited, broadcast
// to everyone). Migrated from the deleted OVERVIEW tab.
export default function PersonalNarrativeLog({ state, setState, round }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')

  const entries = state.narrativeLog || []

  function handleAdd() {
    if (!newTitle.trim() && !newContent.trim()) return
    const entry = {
      id: Date.now(),
      title: newTitle.trim() || 'Untitled',
      content: newContent.trim(),
      round: round ?? 0,
    }
    setState(prev => ({ ...prev, narrativeLog: [...(prev.narrativeLog || []), entry] }))
    setNewTitle('')
    setNewContent('')
    setShowAddModal(false)
  }

  function handleRemove(id) {
    setState(prev => ({ ...prev, narrativeLog: (prev.narrativeLog || []).filter(e => e.id !== id) }))
  }

  return (
    <div className="border border-pip-mid/40 rounded-lg bg-panel overflow-hidden">
      <div className="px-4 py-2 bg-panel-light border-b border-pip-mid/30 flex items-center gap-2">
        <span className="text-amber text-xs tracking-widest font-bold flex-1">MY NARRATIVE LOG</span>
        <span className="text-muted/60 text-[10px] tracking-wider hidden sm:inline">Private to you · auto-records live battles</span>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 text-xs border border-pip text-pip rounded px-3 py-1 hover:bg-pip-dim/20 transition-colors font-bold"
        >
          + ADD ENTRY
        </button>
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={`NEW NARRATIVE ENTRY · ROUND ${round ?? 0}`}
      >
        <div className="space-y-3">
          <div>
            <label className="text-muted text-xs block mb-1 tracking-wider">TITLE</label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Entry title..."
              className="w-full text-xs"
              autoFocus
            />
          </div>
          <div>
            <label className="text-muted text-xs block mb-1 tracking-wider">NARRATIVE</label>
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Describe what happened this round..."
              rows={5}
              className="w-full text-xs resize-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim() && !newContent.trim()}
              className="flex-1 py-2 border border-amber text-amber text-xs font-bold rounded hover:bg-amber/10 disabled:opacity-40 transition-colors"
            >
              ADD TO LOG
            </button>
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 border border-muted/30 text-muted text-xs rounded hover:text-pip transition-colors"
            >
              CANCEL
            </button>
          </div>
        </div>
      </Modal>

      {entries.length === 0 ? (
        <p className="text-muted text-xs text-center py-6">No narrative entries yet. Record your campaign story.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-pip-dim/30">
                <th className="text-left text-info px-4 py-2 tracking-wider font-normal w-12">RND</th>
                <th className="text-left text-info px-4 py-2 tracking-wider font-normal w-36">TITLE</th>
                <th className="text-left text-info px-4 py-2 tracking-wider font-normal">NARRATIVE</th>
                <th className="w-8 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {[...entries].reverse().map((entry, i) => (
                <tr key={entry.id ?? i} className="border-b border-pip-dim/20 hover:bg-panel-light transition-colors">
                  <td className="px-4 py-2 text-pip font-bold">{entry.round ?? '—'}</td>
                  <td className="px-4 py-2 text-amber font-bold">{entry.title}</td>
                  <td className="px-4 py-2 text-pip leading-relaxed whitespace-pre-wrap">{entry.content}</td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => handleRemove(entry.id)}
                      className="text-muted hover:text-danger p-0.5 transition-colors"
                      title="Remove entry"
                    >
                      <X size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
