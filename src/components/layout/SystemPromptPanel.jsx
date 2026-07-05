// ============================================================
// SystemPromptPanel — View/Edit the system prompt
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCollectionPrompt, getDefaultPrompt } from '../../utils/promptManager';

const panelVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 25 },
  },
  exit: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

export default function SystemPromptPanel({
  isOpen,
  onClose,
  customSystemPrompt,
  onApply,
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editText, setEditText] = useState('');
  const textareaRef = useRef(null);

  // The current effective prompt
  const currentPrompt = customSystemPrompt || getCollectionPrompt();

  useEffect(() => {
    if (isOpen) {
      setEditText(currentPrompt);
      setIsEditMode(false);
    }
  }, [isOpen, currentPrompt]);

  useEffect(() => {
    if (isEditMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditMode]);

  const handleApply = () => {
    if (editText.trim() !== getCollectionPrompt()) {
      onApply(editText.trim());
    } else {
      onApply(null); // Reset to default
    }
    setIsEditMode(false);
    onClose();
  };

  const handleReset = () => {
    setEditText(getCollectionPrompt());
    onApply(null);
    setIsEditMode(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="sysprompt-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

        
          {/* Panel */}
          <motion.div
            className="sysprompt-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="sysprompt-header">
              <div className="sysprompt-header-left">
                <h3 className="sysprompt-title">⚙️ System Prompt</h3>
                {customSystemPrompt && (
                  <span className="sysprompt-custom-badge">Custom</span>
                )}
              </div>
              <button className="sysprompt-close" onClick={onClose}>
                ✕
              </button>
            </div>

            {/* Info tooltip */}
            <div className="sysprompt-info">
              <span className="sysprompt-info-icon">💡</span>
              <p>
                The <strong>system prompt</strong> tells the AI how to behave. It defines its
                personality, what questions to ask, and how to format the output. You can view
                and modify it below.
              </p>
            </div>

            {/* Mode toggle */}
            <div className="sysprompt-toggle">
              <button
                className={`sysprompt-tab ${!isEditMode ? 'sysprompt-tab-active' : ''}`}
                onClick={() => setIsEditMode(false)}
              >
                👁️ View
              </button>
              <button
                className={`sysprompt-tab ${isEditMode ? 'sysprompt-tab-active' : ''}`}
                onClick={() => setIsEditMode(true)}
              >
                ✏️ Edit
              </button>
            </div>

            {/* Content */}
            <div className="sysprompt-content">
              {isEditMode ? (
                <textarea
                  ref={textareaRef}
                  className="sysprompt-editor"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  spellCheck={false}
                />
              ) : (
                <pre className="sysprompt-viewer">{currentPrompt}</pre>
              )}
            </div>

            {/* Actions */}
            <div className="sysprompt-actions">
              {isEditMode && (
                <>
                  <button className="btn-sysprompt-apply" onClick={handleApply}>
                    ✅ Apply Prompt
                  </button>
                  <button className="btn-sysprompt-reset" onClick={handleReset}>
                    🔄 Reset to Default
                  </button>
                </>
              )}
              {!isEditMode && customSystemPrompt && (
                <button className="btn-sysprompt-reset" onClick={handleReset}>
                  🔄 Reset to Default
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
