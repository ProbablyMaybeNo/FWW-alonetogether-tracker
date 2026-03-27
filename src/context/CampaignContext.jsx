import { createContext, useContext } from 'react'
import { useCampaignSync } from '../hooks/useCampaignSync'

const CampaignContext = createContext(null)

export function CampaignProvider({ children, campaignId, userId }) {
  const sync = useCampaignSync({ campaignId, userId })

  return (
    <CampaignContext.Provider value={sync}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaign() {
  const ctx = useContext(CampaignContext)
  if (!ctx) throw new Error('useCampaign must be used within CampaignProvider')
  return ctx
}
