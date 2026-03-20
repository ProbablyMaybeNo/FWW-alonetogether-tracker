import { createContext, useContext } from 'react'
import { usePersistedState } from '../hooks/usePersistedState'

const CampaignContext = createContext(null)

export function CampaignProvider({ children }) {
  const persisted = usePersistedState()

  return (
    <CampaignContext.Provider value={persisted}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaign() {
  const ctx = useContext(CampaignContext)
  if (!ctx) throw new Error('useCampaign must be used within CampaignProvider')
  return ctx
}
