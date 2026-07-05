// ============================================================
// PromptAssistantChat — AI Co-pilot for Prompt Administration
// Helps admins understand, navigate, and safely edit prompts
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import './PromptAssistantChat.css';
import { sendMessage } from '../../api/aiProvider';

/**
 * Builds the specialized system instruction for the Prompt Co-pilot
 */
function getAssistantSystemPrompt(activeTab, promptContent) {
  const tabName = activeTab === 'collection' ? 'Collection Prompt (Prompt 1)' : 'Generation Prompt (Prompt 2)';
  return `You are the specialized "Prompt Co-pilot & Safety Advisor" for Atoms Digital Solutions. Your ONLY responsibility is helping system administrators understand, navigate, and safely modify the system prompts.

You are currently advising on the **${tabName}**.
Here is the exact current content of the prompt loaded in their editor:
\`\`\`
${promptContent}
\`\`\`

## STRICT GUIDANCE & BEHAVIORAL RULES:
1. **GUIDE FIRST, DO NOT EDIT IMMEDIATELY:**
   - When the user asks a question like "I want to change X to Y, where do I do it?" or "How do I add a new package?", DO NOT rewrite the prompt or apply the edit yourself at first!
   - Instead, **guide them**: Tell them exactly which Section, Heading, or approximate text/line area to look at in the editor. Explain what keywords or rules to search for (e.g., "Search for 'Step 3 — Base Package' using Ctrl+F").
   - Give them clear, step-by-step guidance so they understand *how* the prompt is structured and where to make the change themselves.

2. **EDIT ONLY WHEN EXPLICITLY REQUESTED:**
   - Only if the user explicitly asks you to make or write the change for them (e.g., "please change it for me", "give me the exact code to paste", "write it out", "apply it", "I don't get it, just do it"), should you output the exact replacement text!
   - When providing replacement text, format it clearly in a Markdown code block so they can easily copy and paste it into their editor.

3. **MANDATORY SAFETY & RISK ASSESSMENT (CRITICAL RULE):**
   - At the very end of EVERY response (whether guiding or providing code), you MUST evaluate the safety of the change/query and include a clear status block!
   - **SAFE CHANGES:** Changing reference pricing, deliverable counts (reels, posters, shoots), tone of voice, adding standard service add-ons, or editing simple explanatory wording/lists.
     - Add this exact tag at the bottom of your message:
       \n\n--- \n✅ **Status: Safe Change** — This modification updates reference values or wording and will not disrupt the project's autonomous workflow.
   - **CRITICAL / RISKY CHANGES:** Manipulating the 7-Step Collection flow, altering \`<PROPOSAL_JSON>\` schema keys or data formatting, changing override mapping rules, removing anti-loop/anti-hallucination instructions, or altering HTML structural tags in the Generation template.
     - If they attempt to modify the project flow, logic, or schema, warn them clearly!
     - Add this exact tag at the bottom of your message:
       \n\n--- \n⚠️ **CRITICAL WARNING: Flow / Schema Manipulation** — You are modifying core project logic or workflow steps. Incorrect changes here may break the autonomous conversation flow, cause AI hallucination, or lead to proposal generation failures! Proceed with extreme caution.

4. **TONE & STYLE:**
   - Be helpful, encouraging, concise, and technical.
   - Use Markdown formatting (bolding, bullet points, code blocks) to make your explanations scannable and easy to read.`;
}

export default function PromptAssistantChat({
  isOpen,
  onClose,
  activeTab,
  promptContent,
}) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `👋 **Hi there! I'm your Prompt Co-pilot.**\n\nI'm here to help you safely navigate and modify the **${activeTab === 'collection' ? 'Collection' : 'Generation'} Prompt**.\n\nAsk me anything like:\n- *"Where do I change the hospital package prices?"*\n- *"How do I add LinkedIn Ads to the platform list?"*\n- *"What happens if I change Step 4?"*\n\nI'll guide you to the exact spot in the editor first!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle sending a message
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setError(null);

    const newHistory = [...messages, { role: 'user', content: userText }];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const systemPrompt = getAssistantSystemPrompt(activeTab, promptContent);
      // Filter out greeting or format for AI provider
      const aiHistory = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await sendMessage(aiHistory, systemPrompt);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.error('[PromptAssistant] Error:', err);
      setError(err.message || 'Failed to get response from AI co-pilot.');
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat history
  const handleClear = () => {
    setMessages([
      {
        role: 'assistant',
        content: `👋 **Chat reset!**\n\nHow can I help you safely modify the **${activeTab === 'collection' ? 'Collection' : 'Generation'} Prompt** today?`,
      },
    ]);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <aside className="copilot-panel">
      {/* Header */}
      <div className="copilot-header">
        <div className="copilot-header-left">
          <span className="copilot-icon">🤖</span>
          <div>
            <h3 className="copilot-title">Prompt Co-pilot</h3>
            <span className="copilot-subtitle">Safety & Navigation Guide</span>
          </div>
        </div>
        <div className="copilot-header-actions">
          <button
            className="copilot-icon-btn"
            onClick={handleClear}
            title="Reset chat history"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete_sweep</span>
          </button>
          <button
            className="copilot-icon-btn copilot-close-btn"
            onClick={onClose}
            title="Close Co-pilot"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="copilot-notice">
        <span className="copilot-notice-icon">💡</span>
        <span>I guide you first! Ask me to edit *only* if you need exact replacement code.</span>
      </div>

      {/* Message List */}
      <div className="copilot-messages">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`copilot-message ${msg.role === 'user' ? 'copilot-msg-user' : 'copilot-msg-assistant'}`}
          >
            {msg.role === 'assistant' && (
              <div className="copilot-avatar">🤖</div>
            )}
            <div className="copilot-bubble">
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="copilot-message copilot-msg-assistant">
            <div className="copilot-avatar">🤖</div>
            <div className="copilot-bubble copilot-bubble-loading">
              <div className="copilot-typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="copilot-error">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form className="copilot-input-area" onSubmit={handleSend}>
        <input
          ref={inputRef}
          type="text"
          className="copilot-input"
          placeholder={`Ask about ${activeTab} prompt...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          className="copilot-send-btn"
          disabled={!input.trim() || isLoading}
          title="Send message"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
        </button>
      </form>
    </aside>
  );
}

/**
 * Helper to render basic markdown formatting (bold, code blocks, lists, warnings)
 */
function MessageContent({ content }) {
  // Split by code blocks first
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Remove fences
          const codeContent = part.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '');
          return (
            <div key={index} className="copilot-code-block">
              <div className="copilot-code-header">
                <span>Suggested Snippet</span>
                <button
                  className="copilot-code-copy"
                  onClick={(e) => {
                    navigator.clipboard.writeText(codeContent);
                    const btn = e.currentTarget;
                    btn.innerText = 'Copied!';
                    setTimeout(() => (btn.innerText = 'Copy'), 2000);
                  }}
                >
                  Copy
                </button>
              </div>
              <pre><code>{codeContent}</code></pre>
            </div>
          );
        }

        // Format regular text paragraphs and line breaks
        const paragraphs = part.split('\n\n');
        return paragraphs.map((para, pIdx) => {
          if (!para.trim()) return null;

          // Check if it's a safety status block
          if (para.includes('✅ **Status: Safe Change**') || para.includes('✅ Status: Safe Change')) {
            return (
              <div key={`${index}-${pIdx}`} className="copilot-status-box copilot-status-safe">
                <span className="copilot-status-icon">✅</span>
                <div>
                  <strong>Status: Safe Change</strong>
                  <p>This modification updates reference values or wording and will not disrupt the project's autonomous workflow.</p>
                </div>
              </div>
            );
          }
          if (para.includes('⚠️ **CRITICAL WARNING:') || para.includes('⚠️ CRITICAL WARNING:')) {
            return (
              <div key={`${index}-${pIdx}`} className="copilot-status-box copilot-status-warning">
                <span className="copilot-status-icon">⚠️</span>
                <div>
                  <strong>CRITICAL WARNING: Flow / Schema Manipulation</strong>
                  <p>You are modifying core project logic or workflow steps. Incorrect changes here may break the autonomous conversation flow or cause proposal generation failures! Proceed with extreme caution.</p>
                </div>
              </div>
            );
          }

          // Simple inline bolding & line breaks
          const formattedPara = para
            .split('\n')
            .map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                <InlineFormat text={line} />
              </React.Fragment>
            ));

          return <p key={`${index}-${pIdx}`} className="copilot-p">{formattedPara}</p>;
        });
      })}
    </>
  );
}

/**
 * Simple inline text formatter (bold and inline code)
 */
function InlineFormat({ text }) {
  // Simple regex for bolding (**text**) and inline code (`code`)
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const tokens = text.split(regex);

  return (
    <>
      {tokens.map((token, idx) => {
        if (token.startsWith('**') && token.endsWith('**')) {
          return <strong key={idx}>{token.slice(2, -2)}</strong>;
        }
        if (token.startsWith('`') && token.endsWith('`')) {
          return <code key={idx} className="copilot-inline-code">{token.slice(1, -1)}</code>;
        }
        return token;
      })}
    </>
  );
}
