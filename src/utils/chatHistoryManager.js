// ============================================================
// Chat History Manager — Supabase-backed persistence
// Scoped by a browser device_id stored in localStorage
// ============================================================

import { supabase } from '../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// ── Device ID ──────────────────────────────────────────────────
// A lightweight UUID stored in localStorage to scope chats to
// this browser/device. Only this tiny ID lives in localStorage.
const DEVICE_ID_KEY = 'proposal_gen_device_id';

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ── Generate Chat ID ────────────────────────────────────────────
export function generateChatId() {
  return uuidv4();
}

// ── Save / Upsert a Chat ──────────────────────────────────────
/**
 * Saves or updates a chat session in Supabase.
 * @param {Object} chatData
 * @param {string} chatData.chatId - Unique chat ID
 * @param {string} [chatData.clientName] - Client display name
 * @param {string} [chatData.clientType] - 'Hospital' | 'Doctor'
 * @param {Array} chatData.messages - Full message array
 * @param {Object} [chatData.proposalJson] - Extracted proposal JSON
 * @param {boolean} [chatData.isRefinementMode] - Current refinement state
 */
export async function saveChat(chatData) {
  if (!supabase) {
    console.warn('[ChatHistory] Supabase not configured — skipping save.');
    return;
  }

  const deviceId = getDeviceId();

  try {
    const { error } = await supabase.from('proposal_sessions').upsert(
      {
        session_id: chatData.chatId,
        device_id: deviceId,
        client_name: chatData.clientName || 'New Chat',
        client_type: chatData.clientType || null,
        conversation_history: chatData.messages,
        proposal_json: chatData.proposalJson || null,
        is_refinement_mode: chatData.isRefinementMode || false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    );

    if (error) {
      console.error('[ChatHistory] Save error:', error.message);
    }
  } catch (err) {
    console.error('[ChatHistory] Unexpected save error:', err);
  }
}

// ── Load a Single Chat ──────────────────────────────────────────
/**
 * Loads a specific chat by ID.
 * @param {string} chatId
 * @returns {Object|null} Chat data or null
 */
export async function loadChat(chatId) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('proposal_sessions')
      .select('*')
      .eq('session_id', chatId)
      .eq('device_id', getDeviceId())
      .single();

    if (error) {
      console.error('[ChatHistory] Load error:', error.message);
      return null;
    }

    return {
      chatId: data.session_id,
      clientName: data.client_name,
      clientType: data.client_type,
      messages: data.conversation_history || [],
      proposalJson: data.proposal_json,
      isRefinementMode: data.is_refinement_mode || false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.error('[ChatHistory] Unexpected load error:', err);
    return null;
  }
}

// ── List All Chats ──────────────────────────────────────────────
/**
 * Lists all chats for this device, sorted by most recent first.
 * @returns {Array} Array of chat summaries
 */
export async function listChats() {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('proposal_sessions')
      .select('session_id, client_name, client_type, created_at, updated_at')
      .eq('device_id', getDeviceId())
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[ChatHistory] List error:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      chatId: row.session_id,
      clientName: row.client_name,
      clientType: row.client_type,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('[ChatHistory] Unexpected list error:', err);
    return [];
  }
}

// ── Delete a Chat ───────────────────────────────────────────────
/**
 * Deletes a chat session from Supabase.
 * @param {string} chatId
 */
export async function deleteChatFromHistory(chatId) {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('proposal_sessions')
      .delete()
      .eq('session_id', chatId);

    if (error) {
      console.error('[ChatHistory] Delete error:', error.message);
    }
  } catch (err) {
    console.error('[ChatHistory] Unexpected delete error:', err);
  }
}

// ── Rename a Chat ───────────────────────────────────────────────
/**
 * Updates the client name for a chat.
 * @param {string} chatId
 * @param {string} newName
 */
export async function renameChat(chatId, newName) {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('proposal_sessions')
      .update({ client_name: newName, updated_at: new Date().toISOString() })
      .eq('session_id', chatId)
      .eq('device_id', getDeviceId());

    if (error) {
      console.error('[ChatHistory] Rename error:', error.message);
    }
  } catch (err) {
    console.error('[ChatHistory] Unexpected rename error:', err);
  }
}
