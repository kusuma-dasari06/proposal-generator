// ============================================================
// AI Provider — Provider-Agnostic Adapter
// Switch between Gemini and Claude by changing VITE_AI_PROVIDER
// Only the key + model name changes — interface stays identical
// ============================================================

import { GoogleGenerativeAI } from '@google/generative-ai';

const PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'gemini';

// ── Gemini Client with Multi-Key Failover ──────────────────
let currentKeyIndex = 0;
let geminiKeys = [];

function getGeminiKeys() {
  if (geminiKeys.length === 0) {
    const keyString = import.meta.env.VITE_GEMINI_API_KEY;
    if (!keyString) throw new Error('VITE_GEMINI_API_KEY is not set');
    
    // Split by comma, remove whitespace, and filter out empties
    geminiKeys = keyString.split(',').map(k => k.trim()).filter(Boolean);
    if (geminiKeys.length === 0) throw new Error('VITE_GEMINI_API_KEY is empty');
  }
  return geminiKeys;
}

function getGeminiClient(keyIndex) {
  const keys = getGeminiKeys();
  const safeIndex = keyIndex % keys.length;
  return new GoogleGenerativeAI(keys[safeIndex]);
}

/**
 * Wraps Gemini API calls to automatically catch rate limits (429/Quota) 
 * and seamlessly switch to the next available API key in the list.
 */
async function withGeminiFailover(action) {
  const keys = getGeminiKeys();
  let attempts = 0;
  
  while (attempts < keys.length) {
    try {
      const ai = getGeminiClient(currentKeyIndex);
      return await action(ai);
    } catch (err) {
      const errMsg = err.message ? err.message.toLowerCase() : '';
      const isRateLimit = err.status === 429 || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('rate limit');
      
      if (isRateLimit && attempts < keys.length - 1) {
        console.warn(`Gemini key at index ${currentKeyIndex} hit rate limit. Switching to next key...`);
        currentKeyIndex = (currentKeyIndex + 1) % keys.length;
        attempts++;
      } else {
        throw err; // Not a rate limit, or we've exhausted all keys
      }
    }
  }
}

async function geminiChat(history, systemPrompt) {
  return withGeminiFailover(async (ai) => {
    const model = ai.getGenerativeModel({
      model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });

    // Everything except the last message becomes the "history" for startChat.
    // Gemini REQUIRES the history to start with a 'user' turn — never 'model'.
    const allPrior = history.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const firstUserIdx = allPrior.findIndex((m) => m.role === 'user');
    const geminiHistory = firstUserIdx >= 0 ? allPrior.slice(firstUserIdx) : [];

    const chat = model.startChat({ history: geminiHistory });
    const lastMessage = history[history.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
  });
}

async function geminiGenerate(prompt) {
  return withGeminiFailover(async (ai) => {
    const model = ai.getGenerativeModel({
      model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash',
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  });
}


// ── Claude Client (stub — ready for swap) ────────────────────
async function claudeChat(history, systemPrompt) {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY;
  const model = import.meta.env.VITE_CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
  if (!apiKey) throw new Error('VITE_CLAUDE_API_KEY is not set');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: history.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Claude API error');
  }
  const data = await response.json();
  return data.content[0].text;
}

async function claudeGenerate(prompt) {
  return claudeChat([{ role: 'user', content: prompt }], '');
}

// ── OpenAI-Compatible Client (e.g. Nvidia NIM) ─────────────────
async function openaiChat(history, systemPrompt) {
  const apiKey = import.meta.env.VITE_NVIDIA_API_KEY || import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  const model = import.meta.env.VITE_NVIDIA_MODEL || import.meta.env.VITE_OPENAI_MODEL || import.meta.env.VITE_GEMINI_MODEL || 'meta/llama-3.1-70b-instruct';
  const baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || '/api/nvidia';

  if (!apiKey) throw new Error('API key is not set for OpenAI/Nvidia provider');

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push(...history.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  })));

  const cleanKey = apiKey.startsWith('Bearer ') ? apiKey.slice(7).trim() : apiKey.trim();

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${cleanKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    let errMsg = 'OpenAI/Nvidia API error';
    try {
      const err = await response.json();
      errMsg = err.error?.message || errMsg;
    } catch (e) {}
    throw new Error(errMsg);
  }
  const data = await response.json();
  return data.choices[0].message.content;
}

async function openaiGenerate(prompt) {
  return openaiChat([{ role: 'user', content: prompt }], '');
}

// ── Ollama Local Client ───────────────────────────────────────
async function ollamaChat(history, systemPrompt) {
  const model = import.meta.env.VITE_OLLAMA_MODEL || 'qwen';
  const baseUrl = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push(...history.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  })));

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    let errMsg = 'Ollama API error';
    try {
      const err = await response.json();
      errMsg = err.error || errMsg;
    } catch (e) {}
    throw new Error(errMsg);
  }
  const data = await response.json();
  return data.message.content;
}

async function ollamaGenerate(prompt) {
  const model = import.meta.env.VITE_OLLAMA_MODEL || 'qwen';
  const baseUrl = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';
  
  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
  });
  
  if (!response.ok) {
    let errMsg = 'Ollama API error';
    try {
      const err = await response.json();
      errMsg = err.error || errMsg;
    } catch (e) {}
    throw new Error(errMsg);
  }
  const data = await response.json();
  return data.response;
}

// ── Public API (provider-agnostic) ───────────────────────────

/**
 * Send a message in a conversation (Prompt 1 — Collection Agent & Co-pilot)
 * Automatically falls back to Gemini API if the active provider fails.
 * @param {Array<{role: 'user'|'assistant', content: string}>} history
 * @param {string} systemPrompt
 * @returns {Promise<string>} AI response text
 */
export async function sendMessage(history, systemPrompt) {
  try {
    if (PROVIDER === 'claude') return await claudeChat(history, systemPrompt);
    if (PROVIDER === 'nvidia' || PROVIDER === 'openai') return await openaiChat(history, systemPrompt);
    if (PROVIDER === 'ollama') return await ollamaChat(history, systemPrompt);
    return await geminiChat(history, systemPrompt);
  } catch (err) {
    if (PROVIDER !== 'gemini') {
      console.warn(`[AIProvider] ${PROVIDER.toUpperCase()} failed ("${err.message}"). Automatically falling back to Gemini API...`);
      return await geminiChat(history, systemPrompt);
    }
    throw err;
  }
}

/**
 * Generate a proposal from JSON (Prompt 2 — Generation Agent)
 * Automatically falls back to Gemini API if the active provider fails.
 * @param {string} fullPrompt - system instructions + JSON merged
 * @returns {Promise<string>} HTML proposal string
 */
export async function generateProposal(fullPrompt) {
  let html = '';
  try {
    if (PROVIDER === 'claude') html = await claudeGenerate(fullPrompt);
    else if (PROVIDER === 'nvidia' || PROVIDER === 'openai') html = await openaiGenerate(fullPrompt);
    else if (PROVIDER === 'ollama') html = await ollamaGenerate(fullPrompt);
    else html = await geminiGenerate(fullPrompt);
  } catch (err) {
    if (PROVIDER !== 'gemini') {
      console.warn(`[AIProvider] ${PROVIDER.toUpperCase()} generation failed ("${err.message}"). Automatically falling back to Gemini API...`);
      html = await geminiGenerate(fullPrompt);
    } else {
      throw err;
    }
  }

  // Strip markdown code fences if the AI includes them
  return html.replace(/```html/gi, '').replace(/```/g, '').trim();
}
