// ============================================================
// useChat Hook — Prompt 1 logic, JSON extraction, refinement
// + Editable/Deletable messages, Chat History, System Prompt
// ============================================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { sendMessage } from '../api/aiProvider';
import { getCollectionPrompt } from '../utils/promptManager';
import {
  generateChatId,
  saveChat,
  loadChat,
  listChats,
  deleteChatFromHistory,
} from '../utils/chatHistoryManager';

const JSON_REGEX = /<PROPOSAL_JSON>([\s\S]*?)<\/PROPOSAL_JSON>/;

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "Hi! I am the Proposal Generator Agent. I will help you collect client details and generate a proposal.\n\nYou can tell me everything at once or I'll guide you step by step. If you'd like to provide all details in a single message, you can copy and paste this format:\n\n`Client Name:`\n`Type (Hospital/Doctor):`\n`City:`\n`Speciality (if Doctor):`\n`Package (Standard/Custom):`\n`Platforms:`\n`Add-ons:`",
};

// ── Filler patterns to strip from AI responses ────────────────
const FILLER_PATTERNS = [
  /^.*user hasn.t responded.*$/gim,
  /^.*we.ll wait.*$/gim,
  /^.*waiting for.*(?:user|input|reply|response|answer).*$/gim,
  /^.*we.* (?:wait|remain|stand\s*by).*$/gim,
  /^.*no further output.*$/gim,
  /^\(.*\)$/gim,
  /^.*user didn.t answer.*$/gim,
  /^.*we should not output.*$/gim,
];

function sanitiseResponse(text) {
  let cleaned = text.replace(JSON_REGEX, '').trim();
  for (const pattern of FILLER_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  return cleaned.replace(/\n{3,}/g, '\n\n').trim();
}

export function useChat({ onProposalJsonReady }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [proposalJson, setProposalJson] = useState(null);
  const [isRefinementMode, setIsRefinementMode] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(generateChatId);
  const [chatList, setChatList] = useState([]);
  const [customSystemPrompt, setCustomSystemPrompt] = useState(null);
  // ── Active system prompt ──────────────────────────────────────
  // Priority: per-session custom > Supabase-stored > hardcoded default
  const activeSystemPrompt = customSystemPrompt || getCollectionPrompt();

  // ── Load chat list on mount ───────────────────────────────────
  useEffect(() => {
    listChats().then(setChatList);
  }, []);

  // ── Auto-save current chat to Supabase ────────────────────────
  const persistChat = useCallback(
    async (msgs, pJson, refinement) => {
      try {
        const clientName = pJson?.clientName || 'New Chat';
        const clientType = pJson?.clientType || null;
        await saveChat({
          chatId: currentChatId,
          clientName,
          clientType,
          messages: msgs,
          proposalJson: pJson,
          isRefinementMode: refinement,
        });
        // Refresh the chat list
        const updated = await listChats();
        setChatList(updated);
      } catch (err) {
        console.error('[useChat] persistChat error:', err);
      }
    },
    [currentChatId]
  );

  // ── Extract JSON helper ───────────────────────────────────────
  const extractJson = useCallback((text) => {
    const match = text.match(JSON_REGEX);
    if (!match) return null;
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      console.error('[useChat] JSON parse error:', e);
      return null;
    }
  }, []);

  // ── Send a message to the AI ──────────────────────────────────
  const sendToAI = useCallback(
    async (updatedMessages) => {
      setIsTyping(true);
      setError(null);

      try {
        const responseText = await sendMessage(updatedMessages, activeSystemPrompt);
        const displayText = sanitiseResponse(responseText);
        const assistantMessage = { role: 'assistant', content: displayText };

        const newMessages = [...updatedMessages, assistantMessage];
        setMessages(newMessages);

        // Check for JSON output
        const extracted = extractJson(responseText);
        let newProposalJson = proposalJson;
        let newRefinement = isRefinementMode;

        if (extracted) {
          newProposalJson = extracted;
          newRefinement = true;
          setProposalJson(extracted);
          setIsRefinementMode(true);
          onProposalJsonReady(extracted, currentChatId, newMessages);
        }

        // Persist to Supabase
        persistChat(newMessages, newProposalJson || extracted, newRefinement);

        return assistantMessage;
      } catch (err) {
        console.error('[useChat] Error:', err);
        setError(err.message || 'Something went wrong. Please try again.');
        const errorMsg = {
          role: 'assistant',
          content: '⚠️ I encountered an error. Please try again.',
        };
        setMessages((prev) => [...prev, errorMsg]);
        return errorMsg;
      } finally {
        setIsTyping(false);
      }
    },
    [activeSystemPrompt, proposalJson, isRefinementMode, extractJson, onProposalJsonReady, currentChatId, persistChat]
  );

  // ── Send user message ─────────────────────────────────────────
  const sendUserMessage = useCallback(
    async (userInput) => {
      if (!userInput.trim()) return;

      const userMessage = { role: 'user', content: userInput };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // Persist immediately so user message is never lost
      persistChat(updatedMessages, proposalJson, isRefinementMode);

      await sendToAI(updatedMessages);
    },
    [messages, sendToAI, persistChat, proposalJson, isRefinementMode]
  );

  // ── Delete a message (and everything after it) ────────────────
  const deleteMessage = useCallback(
    (index) => {
      if (index < 0 || index >= messages.length) return;

      // Keep only messages before the deleted one
      const rewound = messages.slice(0, index);

      // Recalculate proposalJson — scan remaining messages for the last JSON
      let lastJson = null;
      let refinement = false;
      for (const msg of rewound) {
        if (msg.role === 'assistant' && msg._rawResponse) {
          const extracted = extractJson(msg._rawResponse);
          if (extracted) {
            lastJson = extracted;
            refinement = true;
          }
        }
      }

      setMessages(rewound.length > 0 ? rewound : [WELCOME_MESSAGE]);
      setProposalJson(lastJson);
      setIsRefinementMode(refinement);

      // Persist the rewound state
      persistChat(
        rewound.length > 0 ? rewound : [WELCOME_MESSAGE],
        lastJson,
        refinement
      );
    },
    [messages, extractJson, persistChat]
  );

  // ── Edit a message (replace + replay from that point) ─────────
  const editMessage = useCallback(
    async (index, newContent) => {
      if (index < 0 || index >= messages.length) return;
      if (!newContent.trim()) return;

      // Keep messages before the edited one, then add edited message
      const before = messages.slice(0, index);
      const editedMessage = { role: 'user', content: newContent };
      const updatedMessages = [...before, editedMessage];

      setMessages(updatedMessages);

      // Re-send to AI from the edited point
      await sendToAI(updatedMessages);
    },
    [messages, sendToAI]
  );

  // ── New Chat ──────────────────────────────────────────────────
  const newChat = useCallback(async () => {
    // Save current chat first (if it has real content)
    if (messages.length > 1) {
      await persistChat(messages, proposalJson, isRefinementMode);
    }

    const newId = generateChatId();
    setCurrentChatId(newId);
    setMessages([WELCOME_MESSAGE]);
    setProposalJson(null);
    setIsRefinementMode(false);
    setError(null);
  }, [messages, proposalJson, isRefinementMode, persistChat]);

  // ── Load a saved chat ─────────────────────────────────────────
  const loadSavedChat = useCallback(
    async (chatId) => {
      // Save current chat first
      if (messages.length > 1) {
        await persistChat(messages, proposalJson, isRefinementMode);
      }

      const chatData = await loadChat(chatId);
      if (!chatData) {
        setError('Failed to load chat.');
        return;
      }

      setCurrentChatId(chatData.chatId);
      setMessages(
        chatData.messages && chatData.messages.length > 0
          ? chatData.messages
          : [WELCOME_MESSAGE]
      );
      setProposalJson(chatData.proposalJson || null);
      setIsRefinementMode(chatData.isRefinementMode || false);
      setError(null);

      // Notify parent about the loaded proposal JSON
      if (chatData.proposalJson) {
        onProposalJsonReady(
          chatData.proposalJson,
          chatData.chatId,
          chatData.messages
        );
      }
    },
    [messages, proposalJson, isRefinementMode, persistChat, onProposalJsonReady]
  );

  // ── Delete a chat from history ────────────────────────────────
  const deleteChat = useCallback(
    async (chatId) => {
      await deleteChatFromHistory(chatId);

      // If we deleted the current chat, start a new one
      if (chatId === currentChatId) {
        const newId = generateChatId();
        setCurrentChatId(newId);
        setMessages([WELCOME_MESSAGE]);
        setProposalJson(null);
        setIsRefinementMode(false);
        setError(null);
      }

      // Refresh chat list
      const updated = await listChats();
      setChatList(updated);
    },
    [currentChatId]
  );

  // ── Reset Chat (legacy — now wraps newChat) ───────────────────
  const resetChat = useCallback(() => {
    newChat();
  }, [newChat]);

  return {
    messages,
    isTyping,
    error,
    proposalJson,
    isRefinementMode,
    currentChatId,
    chatList,
    customSystemPrompt,
    activeSystemPrompt,
    sendUserMessage,
    deleteMessage,
    editMessage,
    resetChat,
    newChat,
    loadSavedChat,
    deleteChat,
    setCustomSystemPrompt,
  };
}
