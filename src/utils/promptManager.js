// ============================================================
// Prompt Manager — Load/Save system prompts from Supabase
// Falls back to hardcoded defaults if Supabase is unavailable
// ============================================================

import { supabase } from '../lib/supabaseClient';
import { COLLECTION_SYSTEM_PROMPT } from '../prompts/collectionPrompt';
import { GENERATION_SYSTEM_PROMPT } from '../prompts/generationPrompt';

// ── In-memory cache ──────────────────────────────────────────
const cache = {
  collection: null,
  generation: null,
  loaded: false,
};

/**
 * Load both prompts from Supabase into the cache.
 * Called once on app startup; subsequent calls return from cache.
 */
export async function loadPrompts() {
  if (cache.loaded) return cache;
  if (!supabase) {
    console.warn('[PromptManager] Supabase not configured — using defaults.');
    cache.loaded = true;
    return cache;
  }

  try {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('prompt_key, content, updated_at');

    if (error) {
      console.error('[PromptManager] Error loading prompts:', error.message);
    } else if (data) {
      for (const row of data) {
        if (row.prompt_key === 'collection') {
          cache.collection = row.content;
        } else if (row.prompt_key === 'generation') {
          cache.generation = row.content;
        }
      }
    }
  } catch (err) {
    console.error('[PromptManager] Unexpected error:', err);
  }

  cache.loaded = true;
  return cache;
}

/**
 * Get the collection prompt (Supabase version or hardcoded default).
 */
export function getCollectionPrompt() {
  return cache.collection || COLLECTION_SYSTEM_PROMPT;
}

/**
 * Get the generation prompt (Supabase version or hardcoded default).
 */
export function getGenerationPrompt() {
  return cache.generation || GENERATION_SYSTEM_PROMPT;
}

/**
 * Save a prompt to Supabase and update the cache.
 * @param {'collection' | 'generation'} key
 * @param {string} content
 * @returns {{ success: boolean, error?: string }}
 */
export async function savePrompt(key, content) {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured.' };
  }

  try {
    const { error } = await supabase.from('system_prompts').upsert(
      {
        prompt_key: key,
        content: content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'prompt_key' }
    );

    if (error) {
      console.error('[PromptManager] Save error:', error.message);
      return { success: false, error: error.message };
    }

    // Update cache
    cache[key] = content;
    return { success: true };
  } catch (err) {
    console.error('[PromptManager] Unexpected save error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Reset a prompt to the hardcoded default (removes from Supabase).
 * @param {'collection' | 'generation'} key
 * @returns {{ success: boolean, error?: string }}
 */
export async function resetPrompt(key) {
  if (!supabase) {
    cache[key] = null;
    return { success: true };
  }

  try {
    const { error } = await supabase
      .from('system_prompts')
      .delete()
      .eq('prompt_key', key);

    if (error) {
      console.error('[PromptManager] Reset error:', error.message);
      return { success: false, error: error.message };
    }

    cache[key] = null;
    return { success: true };
  } catch (err) {
    console.error('[PromptManager] Unexpected reset error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Fetch raw prompt data from Supabase (bypasses cache).
 * Used by the admin page to get fresh data + metadata.
 * @param {'collection' | 'generation'} key
 * @returns {{ content: string|null, updatedAt: string|null, isCustom: boolean }}
 */
export async function fetchPromptData(key) {
  const defaultContent =
    key === 'collection' ? COLLECTION_SYSTEM_PROMPT : GENERATION_SYSTEM_PROMPT;

  if (!supabase) {
    return { content: defaultContent, updatedAt: null, isCustom: false };
  }

  try {
    const { data, error } = await supabase
      .from('system_prompts')
      .select('content, updated_at')
      .eq('prompt_key', key)
      .single();

    if (error || !data) {
      return { content: defaultContent, updatedAt: null, isCustom: false };
    }

    return {
      content: data.content,
      updatedAt: data.updated_at,
      isCustom: true,
    };
  } catch {
    return { content: defaultContent, updatedAt: null, isCustom: false };
  }
}

/**
 * Get the hardcoded default prompt content (ignoring Supabase).
 * @param {'collection' | 'generation'} key
 */
export function getDefaultPrompt(key) {
  return key === 'collection'
    ? COLLECTION_SYSTEM_PROMPT
    : GENERATION_SYSTEM_PROMPT;
}

/**
 * Invalidate cache so next getCollectionPrompt/getGenerationPrompt
 * call will reflect the latest Supabase data after a reload.
 */
export function invalidateCache() {
  cache.collection = null;
  cache.generation = null;
  cache.loaded = false;
}
