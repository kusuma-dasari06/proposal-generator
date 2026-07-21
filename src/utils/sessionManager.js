// ============================================================
// Session Manager
// Silent background save to Supabase
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient';

export function generateSessionId() {
  return uuidv4();
}

/**
 * Silently save session data to Supabase.
 * Fails gracefully — never disrupts the user flow.
 * @param {Object} params
 */
export async function saveSession({
  sessionId,
  clientName,
  clientType,
  conversationHistory,
  finalProposal,
  proposalJson,
  proposalSections,
}) {
  if (!supabase) {
    console.warn('[Session] Supabase not configured — skipping save.');
    return;
  }

  try {
    const { error } = await supabase.from('proposal_sessions').upsert(
      {
        session_id: sessionId,
        client_name: clientName || 'Unknown',
        client_type: clientType || 'Unknown',
        conversation_history: conversationHistory,
        final_proposal: finalProposal,
        proposal_json: proposalJson,
        // Section-wise JSON — only the section(s) that actually changed
        // are different from the previous save; everything else is
        // carried over untouched.
        proposal_sections: proposalSections || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    );
    if (error) {
      console.error('[Session] Supabase save error:', error.message);
    } else {
      console.log('[Session] Saved successfully:', sessionId);
    }
  } catch (err) {
    console.error('[Session] Unexpected error:', err);
  }
}
