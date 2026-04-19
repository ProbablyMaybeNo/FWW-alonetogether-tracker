import { supabase } from './supabase'

/**
 * Direct RPC update for player_data.settlement_item_deck (e.g. battle setup contribution without full state merge).
 * Params match `public.patch_settlement_item_deck` in supabaseSchema.sql.
 */
export async function patchSettlementItemDeck(campaignId, userId, settlementItemDeck) {
  return supabase.rpc('patch_settlement_item_deck', {
    p_campaign_id: campaignId,
    p_user_id: userId,
    p_settlement_item_deck: settlementItemDeck,
  })
}
