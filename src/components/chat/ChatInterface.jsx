// ============================================================
// ChatInterface — Full-featured chat with message actions
// Sidebar is now persistent at the App level (Gemini layout)
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import { useVoiceInput } from '../../hooks/useVoiceInput';

// Clean line-art icons (white, matches app's minimal aesthetic)
const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const SendArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </svg>
);

export default function ChatInterface({
  messages,
  isTyping,
  error,
  proposalJson,
  isRefinementMode,
  isGenerating,
  onSendMessage,
  onGenerateProposal,
  onReset,
  onEditMessage,
  onDeleteMessage,
  onNewChat,
  onOpenPromptPanel,
}) {
  const [input, setInput] = useState('');
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // ── Auto-resize textarea to fit content (Issue #4 fix) ──────
  const autoResize = useCallback((el) => {
    if (!el) return;
    el.style.height = 'auto';
    const maxH = 160; // ~8 lines
    el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
  }, []);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendCurrentInput = useCallback(() => {
    if (!input.trim() || isTyping || isGenerating) return;
    onSendMessage(input.trim());
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.overflowY = 'hidden';
    }
  }, [input, isTyping, isGenerating, onSendMessage]);

  const handleSubmit = (e) => {
    e.preventDefault();
    sendCurrentInput();
  };

  const { isListening, isSupported, toggleListening, stopListening, updateBaseText } = useVoiceInput({
    onResult: (text) => {
      setInput(text);
      requestAnimationFrame(() => autoResize(inputRef.current));
    },
    onError: (err) => {
      console.warn('[Voice] recognition error:', err);
    },
  });

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
      setTimeout(sendCurrentInput, 150);
    } else {
      toggleListening(input);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canGenerate = !!proposalJson && !isGenerating;

  return (
    <div className="chat-interface">

      {/* Panel header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <h2 className="chat-title">Conversation</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isRefinementMode && (
              <span className="refinement-badge">✏️ Refining</span>
            )}
            {/* System prompt button */}
            <button
              className="btn-header-icon"
              onClick={() => onOpenPromptPanel?.()}
              title="System Prompt"
            >
              ⚙️
            </button>
            <button
              onClick={onNewChat || onReset}
              title="New proposal"
              className="btn-header-new"
            >
              + New
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-area" ref={messagesContainerRef}>
        {messages.map((msg, idx) => (
          <ChatMessage
            key={idx}
            message={msg}
            index={idx}
            onEdit={msg.role === 'user' ? onEditMessage : undefined}
            onDelete={msg.role === 'user' ? onDeleteMessage : undefined}
          />
        ))}
        <AnimatePresence>
          {isTyping && <TypingIndicator key="typing-indicator" />}
        </AnimatePresence>
        {error && (
          <div className="error-banner">⚠️ {error}</div>
        )}
      </div>

      {/* Input row */}
      <form className="chat-input-area" onSubmit={handleSubmit}>
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize(e.target);
              if (isListening) updateBaseText(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening...'
                : isRefinementMode
                ? 'Type a change (e.g. "Change price to ₹70,000")...'
                : 'Enter client details here...'
            }
            rows={1}
            disabled={isTyping || isGenerating}
          />
          {isSupported && (
            <button
              type="button"
              className={`btn-mic ${isListening ? 'listening' : ''}`}
              onClick={handleMicClick}
              disabled={isTyping || isGenerating}
              title={isListening ? 'Tap to send' : 'Speak'}
            >
              {isListening ? <SendArrowIcon /> : <MicIcon />}
            </button>
          )}
          <button
            type="submit"
            className="btn-send"
            disabled={!input.trim() || isTyping || isGenerating}
          >
            Send
          </button>
        </div>
      </form>

      {/* Generate button */}
      <div className="generate-cta">
        <button
          className="btn-generate"
          onClick={onGenerateProposal}
          disabled={!canGenerate}
        >
          {isGenerating ? (
            <><span className="btn-spinner" /> Generating...</>
          ) : (
            'Generate Proposal Preview'
          )}
        </button>
        {isRefinementMode && canGenerate && (
          <p className="refinement-hint">
            💡 Chat to refine, then click Generate again to update
          </p>
        )}
      </div>
    </div>
  );
}
